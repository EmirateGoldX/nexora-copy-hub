-- ============================================================================
-- NEXORA COPY HUB — Data contoh (DEMO)
-- Migrasi 0002
--
-- PERINGATAN: ini data DEMO untuk pengembangan tampilan, bukan akun nyata.
-- Tidak ada password di sini. credential_ref sengaja dikosongkan.
-- ============================================================================

begin;

-- akun master (demo)
insert into masters (label, broker, server, login, symbol, poll_interval_ms, l2_enabled, note)
values
  ('Master A', 'Exness',     'Exness-MT5Trial14', '415823123',  'XAUUSD',   250, true, 'akun demo untuk uji observer'),
  ('Master B', 'IC Markets', 'ICMarketsSC-MT5',   '1191030705', 'XAUUSD.m', 250, true, 'akun demo lintas broker'),
  ('Master C', 'XM',         'XMGlobal-MT5 10',   '191397900',  'GOLD',     500, true, 'dipakai menguji skenario stale')
on conflict do nothing;

-- akun follower (demo)
-- CAST 'fixed'::volume_rule WAJIB: pada INSERT ... UNION ALL, Postgres
-- menyimpulkan tipe gabungan sebagai text, bukan enum volume_rule.
insert into followers (label, broker, server, login, master_id, map_symbol_from, map_symbol_to,
                       volume_rule, volume_value, copy_partial, copy_pending, clamp_sltp,
                       max_lot, max_positions, note)
select 'Follower 1', 'Exness', 'Exness-MT5Trial14', '416546980', m.id,
       'XAUUSD', 'XAUUSD', 'fixed'::volume_rule, 0.05, true, true, true, 0.50, 5, 'demo'
from masters m where m.login = '415823123'
union all
select 'Follower 2', 'Exness', 'Exness-MT5Trial14', '415823124', m.id,
       'XAUUSD', 'XAUUSDm', 'multiplier'::volume_rule, 1.0, true, true, true, 0.50, 5, 'demo'
from masters m where m.login = '415823123'
union all
select 'Follower 3', 'IC Markets', 'ICMarketsSC-MT5', '1191030711', m.id,
       'XAUUSD', 'XAUUSD.m', 'equity'::volume_rule, 0.8, true, true, true, 0.30, 3, 'demo'
from masters m where m.login = '415823123'
union all
select 'Follower 4', 'XM', 'XMGlobal-MT5 10', '191397901', m.id,
       'GOLD', 'GOLD', 'fixed'::volume_rule, 0.10, true, true, true, 0.50, 5, 'demo'
from masters m where m.login = '191397900'
on conflict do nothing;

-- broker profile contoh (angka WAJIB diganti hasil probe terminal nyata)
insert into broker_profiles (server, symbol, digits, point, contract_size, tick_value,
                             volume_min, volume_max, volume_step, stops_level_pts, filling_modes, trade_mode)
values
  ('Exness-MT5Trial14', 'XAUUSDm',  3, 0.001, 100, 0.10, 0.01, 200, 0.01, 30, array['IOC','FOK'], 'demo'),
  ('ICMarketsSC-MT5',   'XAUUSD.m', 2, 0.01,  100, 1.00, 0.01, 100, 0.01, 32, array['FOK','IOC'], 'demo'),
  ('XMGlobal-MT5 10',   'GOLD',     2, 0.01,  100, 1.00, 0.01, 100, 0.01, 25, array['IOC'],       'demo')
on conflict do nothing;

-- worker contoh
insert into workers (code, host, region, role, status)
values
  ('W1', 'win-worker-01', 'Jakarta',   'master_observer',   'ok'),
  ('W2', 'win-worker-02', 'Jakarta',   'follower_executor', 'ok'),
  ('W3', 'win-worker-03', 'Singapore', 'follower_executor', 'ok')
on conflict (code) do nothing;

-- metrik worker contoh
insert into worker_metrics (worker_id, terminal_count, ram_used_mb, ram_total_mb, cpu_pct, restart_count)
select w.id, m.terminals, m.used, m.total, m.cpu, m.restarts
from (values
  ('W1',  3, 2150,  8192, 17.0, 0),
  ('W2', 10, 6400, 16384, 31.0, 1),
  ('W3',  8, 5200, 16384, 26.0, 0)
) as m(code, terminals, used, total, cpu, restarts)
join workers w on w.code = m.code;

-- hubungkan akun ke worker
update masters   set worker_id = (select id from workers where code = 'W1');
update followers set worker_id = (select id from workers where code = 'W2')
  where label in ('Follower 1', 'Follower 2', 'Follower 3');
update followers set worker_id = (select id from workers where code = 'W3')
  where label = 'Follower 4';

-- user dashboard contoh (password_hash sengaja null — belum ada auth nyata)
insert into users (email, display_name, role, mfa_enabled)
values ('owner@example.com', 'Owner', 'owner', false)
on conflict (email) do nothing;

commit;

-- ============================================================================
-- VERIFIKASI CEPAT
--   select label, broker, login, symbol, status from masters order by label;
--   select * from v_follower_status order by label;
-- ============================================================================
