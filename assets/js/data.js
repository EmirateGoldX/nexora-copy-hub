/* ============================================================
   NEXORA COPY HUB — DATA CONTOH (MOCK)
   ------------------------------------------------------------
   PERINGATAN PENTING:
   Seluruh angka di file ini adalah DATA CONTOH untuk keperluan
   desain tampilan. BUKAN hasil pengujian, BUKAN data akun nyata,
   dan TIDAK berasal dari PoC mana pun (PoC belum dijalankan).

   Saat backend tersedia, file ini digantikan oleh API.
   Tidak ada kredensial di file ini dan tidak boleh ada.
   ============================================================ */

window.NX_MOCK = true;

window.NX = (() => {
  const masters = [
    {
      id: 'A', key: 'A', name: 'Master A', broker: 'Exness', login: '415823123',
      symbol: 'XAUUSD', mode: 'investor read-only', health: 'ok',
      latency: 280, lastEvent: '8 mnt lalu', staleMins: 0,
      layers: 'L1+L2 aktif', followers: 6, open: 3, drift: 0, syncErr: 0,
    },
    {
      id: 'B', key: 'B', name: 'Master B', broker: 'IC Markets', login: '1191030705',
      symbol: 'XAUUSD.m', mode: 'investor read-only', health: 'ok',
      latency: 334, lastEvent: '2 mnt lalu', staleMins: 0,
      layers: 'L1+L2 aktif', followers: 7, open: 4, drift: 2, syncErr: 0,
    },
    {
      id: 'C', key: 'C', name: 'Master C', broker: 'XM', login: '191397900',
      symbol: 'GOLD', mode: 'investor read-only', health: 'stale',
      latency: null, lastEvent: 'tidak ada', staleMins: 4,
      layers: 'L1+L2 aktif', followers: 5, open: 1, drift: 1, syncErr: 0,
    },
  ];

  const followers = [
    { id: 1,  name: 'Follower 1',  master: 'A', broker: 'Exness',      login: '416546980',  map: 'XAUUSD',  vol: 'Fixed 0.05',    status: 'sync',  conn: 'online', open: 3, latency: 298, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 2,  name: 'Follower 2',  master: 'A', broker: 'Exness',      login: '415823123',  map: 'XAUUSDm', vol: 'Multiplier ×1.0', status: 'sync', conn: 'online', open: 3, latency: 301, drift: 0,    allowed: 1,    sltp: 'cocok',         note: '' },
    { id: 3,  name: 'Follower 3',  master: 'A', broker: 'IC Markets',  login: '1191030705', map: 'XAUUSD.m',vol: 'Equity 0.8×',   status: 'sync',  conn: 'online', open: 2, latency: 455, drift: 0,    allowed: 1,    sltp: 'cocok',         note: '' },
    { id: 5,  name: 'Follower 5',  master: 'A', broker: 'Exness',      login: '416546990',  map: 'XAUUSDm', vol: 'Multiplier ×0.5', status: 'sync', conn: 'online', open: 1, latency: 277, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 9,  name: 'Follower 9',  master: 'A', broker: 'IC Markets',  login: '1191030711', map: 'XAUUSD.m',vol: 'Fixed 0.02',    status: 'sync',  conn: 'online', open: 2, latency: 388, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 11, name: 'Follower 11', master: 'A', broker: 'Exness',      login: '416546977',  map: 'XAUUSD',  vol: 'Fixed 0.10',    status: 'sync',  conn: 'online', open: 3, latency: 312, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },

    { id: 6,  name: 'Follower 6',  master: 'B', broker: 'Exness',      login: '416546981',  map: 'XAUUSD',  vol: 'Fixed 0.05',    status: 'sync',  conn: 'online', open: 2, latency: 340, drift: 0,    allowed: 1,    sltp: 'cocok',         note: '' },
    { id: 8,  name: 'Follower 8',  master: 'B', broker: 'XM',          login: '191397905',  map: 'GOLD',    vol: 'Fixed 0.03',    status: 'sync',  conn: 'online', open: 1, latency: 620, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 10, name: 'Follower 10', master: 'B', broker: 'IC Markets',  login: '1191030719', map: 'XAUUSD.m',vol: 'Multiplier ×1.5', status: 'sync', conn: 'online', open: 2, latency: 402, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 14, name: 'Follower 14', master: 'B', broker: 'Exness',      login: '416546988',  map: 'XAUUSDm', vol: 'Fixed 0.05',    status: 'sync',  conn: 'online', open: 1, latency: 355, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 15, name: 'Follower 15', master: 'B', broker: 'XM',          login: '191397907',  map: 'GOLD',    vol: 'Equity 0.5×',   status: 'sync',  conn: 'online', open: 0, latency: 588, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 17, name: 'Follower 17', master: 'B', broker: 'IC Markets',  login: '1191030722', map: 'XAUUSD.m',vol: 'Fixed 0.04',    status: 'sync',  conn: 'online', open: 2, latency: 431, drift: 0,    allowed: 1,    sltp: 'cocok',         note: '' },
    { id: 18, name: 'Follower 18', master: 'B', broker: 'Exness',      login: '416546992',  map: 'XAUUSD',  vol: 'Fixed 0.06',    status: 'sync',  conn: 'online', open: 1, latency: 336, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },

    { id: 4,  name: 'Follower 4',  master: 'C', broker: 'XM',          login: '191397900',  map: 'GOLD',    vol: 'Fixed 0.10',    status: 'hold',  conn: 'online', open: 1, latency: 1210,drift: 1,    allowed: 1,    sltp: 'cocok',         note: 'ditahan: master stale' },
    { id: 7,  name: 'Follower 7',  master: 'C', broker: 'Exness',      login: '416546981',  map: 'XAUUSDm', vol: 'Fixed 0.05',    status: 'orphan',conn: 'down',   open: 2, latency: null,drift: 2,    allowed: 0,    sltp: 'SL/TP dijaga',  note: 'reconcile dulu' },
    { id: 12, name: 'Follower 12', master: 'C', broker: 'XM',          login: '191397901',  map: 'GOLD',    vol: 'Equity 0.8×',   status: 'sync',  conn: 'online', open: 0, latency: 640, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
    { id: 13, name: 'Follower 13', master: 'C', broker: 'Exness',      login: '416546984',  map: 'XAUUSDm', vol: 'Fixed 0.03',    status: 'sync',  conn: 'online', open: 1, latency: 700, drift: 0,    allowed: 1,    sltp: 'cocok',         note: '' },
    { id: 16, name: 'Follower 16', master: 'C', broker: 'XM',          login: '191397909',  map: 'GOLD',    vol: 'Multiplier ×1.0', status: 'sync',conn: 'online', open: 0, latency: 615, drift: 0,    allowed: 0,    sltp: 'cocok',         note: '' },
  ];

  const events = [
    { t: '02:14:36', tag: 'OPEN',   cls: 't-open',  msg: 'Master <b>A</b> #50121 BUY 0.10 XAUUSD &rarr; 6 follower', lat: '310ms' },
    { t: '02:14:22', tag: 'MODIFY', cls: 't-mod',   msg: 'Master <b>B</b> #50118 SL 4090.00 &rarr; 4096.50',          lat: '402ms' },
    { t: '02:13:58', tag: 'PARTIAL',cls: 't-part',  msg: 'Master <b>A</b> #50104 tutup sebagian 0.04 &middot; sisa 0.06', lat: '288ms' },
    { t: '02:13:41', tag: 'ORPHAN', cls: 't-orph',  msg: 'Follower <b>7</b> terputus &middot; posisi ditandai ORPHANED, SL/TP dipertahankan', lat: '&mdash;' },
    { t: '02:13:30', tag: 'STALE',  cls: 't-drift', msg: 'Master <b>C</b> tidak ada update 4 mnt &middot; copy 5 follower dihentikan sementara', lat: '&mdash;' },
    { t: '02:13:30', tag: 'PENDING',cls: 't-pend',  msg: 'Master <b>C</b> BUY LIMIT 0.05 @ 4088.00 dipasang',           lat: '366ms' },
    { t: '02:13:12', tag: 'CLOSE',  cls: 't-close', msg: 'Master <b>B</b> #50102 tutup penuh 0.08 &middot; +12.40',      lat: '341ms' },
    { t: '02:12:55', tag: 'OPEN',   cls: 't-open',  msg: 'Master <b>A</b> #50117 SELL 0.06 XAUUSD &rarr; 6 follower',    lat: '295ms' },
    { t: '02:12:48', tag: 'RECON',  cls: 't-rec',   msg: 'Reconcile Follower <b>7</b> setelah reconnect &middot; sisa 2 posisi', lat: '&mdash;' },
    { t: '02:12:31', tag: 'DRIFT',  cls: 't-drift', msg: 'Follower <b>2</b> drift 0.01 lot &middot; allowed (lot step broker)', lat: '&mdash;' },
    { t: '02:12:04', tag: 'ERROR',  cls: 't-err',   msg: 'Follower <b>7</b> 2 sync error &middot; posisi hilang setelah reconnect', lat: '&mdash;' },
    { t: '02:11:47', tag: 'MODIFY', cls: 't-mod',   msg: 'Master <b>A</b> #50117 TP 4120.00 &rarr; 4126.00',            lat: '322ms' },
    { t: '02:11:19', tag: 'OPEN',   cls: 't-open',  msg: 'Master <b>B</b> #50118 BUY 0.08 XAUUSD.m &rarr; 7 follower',   lat: '358ms' },
    { t: '02:10:58', tag: 'CLOSE',  cls: 't-close', msg: 'Master <b>A</b> #50099 tutup penuh 0.05 &middot; &minus;4.10',   lat: '301ms' },
    { t: '02:10:31', tag: 'STALE',  cls: 't-drift', msg: 'Master <b>C</b> observer hidup tetapi data tidak berubah',      lat: '&mdash;' },
  ];

  const logs = [
    { t: '02:14:00', tag: 'RECON', cls: 't-rec',   msg: 'F1&ndash;F18 diperiksa &middot; <b>34 allowed</b> &middot; <b style="color:#fda4af">1 error</b>' },
    { t: '02:13:41', tag: 'ORPHAN',cls: 't-orph',  msg: 'Follower 7 terputus &middot; 2 posisi &rarr; <b>ORPHANED</b>, SL/TP dipertahankan' },
    { t: '02:13:30', tag: 'STALE', cls: 't-drift', msg: '3 instruksi dibuang (TTL lewat) &middot; tidak dieksekusi' },
    { t: '02:12:48', tag: 'OK',    cls: 't-open',  msg: 'F4 ditahan &mdash; master C stale sejak 02:10:31' },
    { t: '02:11:02', tag: 'RECON', cls: 't-rec',   msg: 'F7 reconcile setelah reconnect &middot; sisa 2 posisi' },
    { t: '02:10:31', tag: 'STALE', cls: 't-drift', msg: 'Master C tidak ada update 4 mnt &middot; observer hidup' },
  ];

  const workers = [
    { id: 'W1', host: 'win-worker-01', region: 'Jakarta', role: 'Master observer', terminals: 3, ram: '2.1 / 8 GB', cpu: '17%', uptime: '6d 04h 12m', restarts: 0, status: 'ok',   note: 'menjalankan semua master observer' },
    { id: 'W2', host: 'win-worker-02', region: 'Jakarta', role: 'Follower executor', terminals: 10, ram: '6.4 / 16 GB', cpu: '31%', uptime: '6d 04h 10m', restarts: 1, status: 'ok',   note: '10 terminal aktif' },
    { id: 'W3', host: 'win-worker-03', region: 'Singapore', role: 'Follower executor', terminals: 8, ram: '5.2 / 16 GB', cpu: '26%', uptime: '2d 11h 03m', restarts: 0, status: 'ok',  note: '8 terminal aktif' },
  ];

  const routingRules = [
    { master: 'A', follower: 1,  map: 'XAUUSD → XAUUSD',   vol: 'Fixed 0.05',     state: 'valid' },
    { master: 'A', follower: 2,  map: 'XAUUSD → XAUUSDm',  vol: 'Multiplier ×1.0',state: 'valid' },
    { master: 'A', follower: 3,  map: 'XAUUSD → XAUUSD.m', vol: 'Equity 0.8×',    state: 'valid' },
    { master: 'B', follower: 8,  map: 'XAUUSD.m → GOLD',   vol: 'Fixed 0.03',     state: 'valid' },
    { master: 'B', follower: 10, map: 'XAUUSD.m → XAUUSD.m', vol: 'Multiplier ×1.5', state: 'valid' },
    { master: 'C', follower: 4,  map: 'GOLD → GOLD',       vol: 'Fixed 0.10',     state: 'hold'  },
    { master: 'C', follower: 7,  map: 'GOLD → XAUUSDm',    vol: 'Fixed 0.05',     state: 'error' },
  ];

  const config = {
    symbolMap: 'XAUUSD → XAUUSDm',
    volumeRule: 'Multiplier ×1.0',
    execution: 'OrderCheck → OrderSend',
    sltpClamp: 'stops level 32 pts',
    partial: 'Disalin (per DEAL_POSITION_ID)',
    pending: 'Disalin',
    ttl: '8 detik',
  };

  const security = [
    { k: 'Enkripsi kredensial',  v: 'Envelope encryption (AES-256) + KMS terpisah', st: 'ok' },
    { k: 'Password plaintext',   v: 'Tidak ada penyimpanan permanen',               st: 'ok' },
    { k: 'Transport worker',     v: 'mTLS worker ↔ backend',                        st: 'ok' },
    { k: 'MFA dashboard',        v: 'Aktif untuk akun administratif',               st: 'ok' },
    { k: 'Audit trail',          v: 'Semua instruksi & perubahan konfigurasi',      st: 'ok' },
    { k: 'Secret scanning CI',   v: 'Belum dikonfigurasi (menunggu CI)',            st: 'warn' },
    { k: 'Rotasi kredensial',    v: 'Jadwal belum ditetapkan',                      st: 'warn' },
    { k: 'Least privilege',      v: 'Worker hanya akses akun yang ditugaskan',      st: 'ok' },
  ];

  const settings = [
    { k: 'Interval polling observer', v: '250 ms (parameter eksperimen)' },
    { k: 'Reconcile otomatis',        v: '10 detik' },
    { k: 'TTL instruksi',             v: '8 detik' },
    { k: 'Kebijakan orphan',          v: 'Tahan entry baru · jangan auto-close · jaga SL/TP · tandai ORPHANED · reconcile dulu' },
    { k: 'Definisi drift',            v: 'allowed (konfigurasi/broker) vs sync error (kegagalan sinkronisasi)' },
    { k: 'Konektor',                  v: 'BELUM DIPILIH — menunggu PoC (EA vs Python)' },
    { k: 'Provider cloud',            v: 'BELUM DIPILIH — menunggu benchmark' },
    { k: 'Mode akun',                 v: 'DEMO' },
  ];

  const summary = {
    masters: masters.length,
    followers: followers.length,
    openPositions: followers.reduce((a, f) => a + f.open, 0),
    orphaned: followers.filter(f => f.status === 'orphan').length,
    syncErrors: 1,
    allowedDrift: 34,
    eventsPerMin: 37,
    uptime: '6d 04h',
    workers: workers.length,
    median: 412, p95: 688, p99: 1240,
    lastReconcile: '02:14:00',
    staleDiscarded: 3,
    ttl: '8 s',
  };

  return { masters, followers, events, logs, workers, routingRules, config, security, settings, summary };
})();
