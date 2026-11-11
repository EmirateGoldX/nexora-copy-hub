/* ============================================================
   NEXORA COPY HUB — Router + Views
   Hash router agar setiap halaman bisa dibuka langsung dan
   tombol back/forward browser bekerja normal.
   Fokus tahap ini: tampilan + navigasi (belum ada backend).
   ============================================================ */
(() => {
  const D = window.NX;
  const $ = (s, r = document) => r.querySelector(s);
  const view = () => $('#view');

  /* ---------- helper ---------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const STAT = {
    sync:   ['SINKRON',  's-ok'],
    hold:   ['JEDA',     's-warn'],
    orphan: ['ORPHANED', 's-bad'],
    idle:   ['IDLE',     's-idle'],
  };
  const badge = (st) => {
    const [txt, cls] = STAT[st] || STAT.idle;
    return `<span class="fstat ${cls}">${txt}</span>`;
  };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const shift = (v) => esc(v == null ? '' : v);           // nilai; '' bila null

  const ms = (v, color) => v == null
    ? '<span style="color:var(--dim2)">&mdash;</span>'
    : `<span class="mono"${color ? ` style="color:${color}"` : ''}>${v}<span style="font-size:10px">ms</span></span>`;

  const healthChip = (h) => h === 'ok'
    ? '<span class="chip gn"><span class="live"></span>SEHAT</span>'
    : `<span class="chip am">&#9888; STALE</span>`;

  const followerCard = (f) => {
    const barW = f.status === 'orphan' ? 100 : f.status === 'hold' ? 22 : Math.max(2, f.drift * 8);
    const barCol = f.status === 'orphan' ? 'linear-gradient(90deg,#fb7185,#f43f5e)'
      : f.status === 'hold' ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
      : 'linear-gradient(90deg,#34d399,#22d3ee)';
    return `
      <div class="f">
        <div class="ftop">
          <div><div class="fname">${esc(f.name)}</div>
          <div class="fbro mono">${esc(f.broker)} &middot; ${esc(f.login)}</div></div>
          ${badge(f.status)}
        </div>
        <div class="lk"><span>Map symbol</span><b class="mono">${esc(f.map)}</b></div>
        <div class="lk"><span>Volume</span><b>${esc(f.vol)}</b></div>
        <div class="lk"><span>Posisi</span><b class="mono">${f.open} &middot; ${esc(f.sltp)}</b></div>
        <div class="bar" style="margin-top:10px"><i style="width:${barW}%;background:${barCol}"></i></div>
        <div class="ffoot">
          <span${f.status === 'orphan' ? ' style="color:#fda4af"' : f.status === 'hold' ? ' style="color:#fcd34d"' : ''}>
            ${f.drift ? `drift ${f.drift}${f.allowed ? ' &middot; allowed ' + f.allowed : ''}` : 'drift 0 &middot; allowed 0'}
          </span>
          <span style="margin-left:auto;color:${f.status === 'orphan' ? '#fda4af' : f.status === 'hold' ? 'var(--dim2)' : '#6ee7b7'}">
            ${f.note ? esc(f.note) : ms(f.latency)}
          </span>
        </div>
      </div>`;
  };

  const eventRow = (e) => `
    <div class="ev">
      <span class="ts mono">${e.t}</span>
      <span class="tag ${e.cls}">${e.tag}</span>
      <span class="msg">${e.msg}</span>
      <span class="lat mono">${e.lat || ''}</span>
    </div>`;

  const masterCard = (m, followerList) => `
    <section class="card${m.health === 'stale' ? ' warnc' : ''}">
      <div class="ghead">
        <div class="av ${m.key.toLowerCase()}">${esc(m.key)}</div>
        <div class="gid">
          <div class="gname">${esc(m.name)} &mdash; ${esc(m.broker)}</div>
          <div class="gmeta mono">${esc(m.login)} &middot; ${esc(m.symbol)} &middot; ${esc(m.mode)}${m.health === 'stale' ? ' &middot; <span style="color:#fcd34d">stale ' + m.staleMins + ' mnt</span>' : ''}</div>
        </div>
        <div class="gstats">
          <div class="gs"><div class="n mono">${m.followers}</div><div class="t">Follower</div></div>
          <div class="gs"><div class="n mono">${m.open}</div><div class="t">Posisi</div></div>
          <div class="gs"><div class="n mono">${ms(m.latency, m.health === 'ok' ? '#6ee7b7' : null)}</div><div class="t">Latensi</div></div>
        </div>
        <a href="#/master/${m.id}" class="btn sm">Detail</a>
      </div>
      <div class="fgrid">${followerList.map(followerCard).join('')}</div>
    </section>`;

  /* ============================================================
     HALAMAN
     ============================================================ */

  const pages = {};

  /* ---------- 1. CONTROL ROOM ---------- */
  pages[''] = pages['control'] = () => {
    const s = D.summary;
    const onA = D.followers.filter(f => f.master === 'A');
    const onC = D.followers.filter(f => f.master === 'C');
    return `
      <div class="head">
        <div>
          <h1>Control Room</h1>
          <p>${s.masters} master &middot; ${s.followers} follower &middot; ${s.openPositions} posisi terbuka &middot; rekonsiliasi ${s.lastReconcile}</p>
        </div>
        <div class="clock mono">02:14:37 WIB</div>
      </div>

      <div class="g auto268">
        <a class="al bad" href="#/follower/7">
          <div class="ic">&#9940;</div>
          <div class="tx"><h4>Sync error &middot; Follower 7</h4>
            <p>2 posisi tidak sinkron setelah reconnect. Sudah direkonsiliasi, menunggu verifikasi.</p></div>
          <span class="go">Periksa &rarr;</span>
        </a>
        <a class="al warn" href="#/master/C">
          <div class="ic">&#9888;</div>
          <div class="tx"><h4>Master C stale 4 mnt</h4>
            <p>Terminal hidup tapi tanpa update. Copy untuk 5 follower dihentikan sementara.</p></div>
          <span class="go">Detail &rarr;</span>
        </a>
        <a class="al info" href="#/log">
          <div class="ic">&#8635;</div>
          <div class="tx"><h4>3 instruksi stale dibuang</h4>
            <p>Kedaluwarsa saat follower offline &mdash; tidak dieksekusi sesuai kebijakan.</p></div>
          <span class="go">Log &rarr;</span>
        </a>
      </div>

      <div class="g auto268">
        <div class="card stat">
          <div class="lab">Status sistem</div>
          <div class="val gtext">SINKRON ${s.followers - s.orphaned - 1}/${s.followers}</div>
          <div class="note">${s.syncErrors} sync error &middot; ${s.orphaned} posisi ORPHANED &middot; 1 master stale</div>
          <div class="mstat">
            <div class="ms"><div class="n mono">${s.eventsPerMin}</div><div class="t">Event/menit</div></div>
            <div class="ms"><div class="n mono">${esc(s.uptime)}</div><div class="t">Uptime</div></div>
            <div class="ms"><div class="n mono">${s.workers}</div><div class="t">Worker</div></div>
          </div>
        </div>

        <div class="card stat">
          <div class="lab">Latensi copy</div>
          <div class="ring">
            <div class="ringv"><i>${s.median}<span style="font-size:9px">ms</span></i></div>
            <div class="ringtxt">median<br>P95 <b class="mono">${s.p95} ms</b><br>P99 <b class="mono">${s.p99} ms</b></div>
          </div>
          <div class="spark">
            ${[38, 52, 44, 67, 58, 74, 49, 63, 82, 55, 71, 46].map(h => `<i style="height:${h}%"></i>`).join('')}
          </div>
        </div>

        <div class="card stat">
          <div class="lab">Drift</div>
          <div class="val mono" style="color:#fcd34d">${s.allowedDrift}</div>
          <div class="note">allowed drift (konfigurasi / batasan broker)</div>
          <div style="margin-top:12px">
            <div class="bar"><i style="width:16%;background:linear-gradient(90deg,#34d399,#22d3ee)"></i></div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:var(--fs-xs)">
              <span style="color:#fda4af;font-weight:800">${s.syncErrors} sync error</span>
              <span style="color:var(--dim2)">auto-reconcile 10s</span>
            </div>
          </div>
        </div>
      </div>

      ${masterCard(D.masters[0], onA)}
      ${masterCard(D.masters[2], onC)}

      <div class="card">
        <div class="strip">
          <span>Reconciler <b class="mono">${s.lastReconcile}</b></span><span class="sep"></span>
          <span>Allowed <b class="mono">${s.allowedDrift}</b></span><span class="sep"></span>
          <span style="color:#fda4af">Sync error <b class="mono" style="color:#fda4af">${s.syncErrors}</b></span><span class="sep"></span>
          <span>Stale dibuang <b class="mono">${s.staleDiscarded}</b></span><span class="sep"></span>
          <span>TTL instruksi <b class="mono">${s.ttl}</b></span>
          <span style="margin-left:auto">Worker <b>W1 &middot; W2 &middot; W3</b> sehat</span>
        </div>
      </div>`;
  };

  /* ---------- 2. MASTER LIST ---------- */
  pages['masters'] = () => `
    <div class="head">
      <div><h1>Master</h1>
        <p>${D.masters.length} akun master diamati lewat investor password (read-only)</p></div>
      <div class="clock mono">02:14:37 WIB</div>
    </div>
    ${D.masters.map(m => masterCard(m, D.followers.filter(f => f.master === m.id))).join('')}`;

  /* ---------- 3. MASTER DETAIL ---------- */
  pages['master'] = (id) => {
    const m = D.masters.find(x => x.id === id);
    if (!m) return notFound('Master', id);
    const fl = D.followers.filter(f => f.master === m.id);
    const evs = D.events.slice(0, 6);
    return `
      <div class="crumb"><a href="#/masters">Master</a><span class="s">/</span><span>${esc(m.name)}</span></div>
      <div class="head">
        <div>
          <h1>${esc(m.name)} &mdash; ${esc(m.broker)}</h1>
          <p class="mono">${esc(m.login)} &middot; ${esc(m.symbol)} &middot; ${esc(m.mode)}</p>
        </div>
        ${healthChip(m.health)}
      </div>

      <div class="g auto268">
        <div class="card stat">
          <div class="lab">Observer</div>
          <div class="val ${m.health === 'ok' ? 'gtext' : ''}" style="${m.health === 'ok' ? '' : 'color:#fcd34d'}">
            ${m.health === 'ok' ? 'AKTIF' : 'STALE'}
          </div>
          <div class="note">${esc(m.layers)} &middot; investor read-only</div>
          <div class="mstat">
            <div class="ms"><div class="n mono">${m.latency == null ? '—' : m.latency + 'ms'}</div><div class="t">Latensi</div></div>
            <div class="ms"><div class="n mono">${esc(m.lastEvent)}</div><div class="t">Event terakhir</div></div>
          </div>
        </div>

        <div class="card stat">
          <div class="lab">Beban</div>
          <div class="val mono">${m.followers}</div>
          <div class="note">follower menerima copy dari master ini</div>
          <div class="mstat">
            <div class="ms"><div class="n mono">${m.open}</div><div class="t">Posisi terbuka</div></div>
            <div class="ms"><div class="n mono">${m.drift}</div><div class="t">Drift</div></div>
          </div>
        </div>

        <div class="card stat">
          <div class="lab">Kesehatan</div>
          <div class="val mono" style="color:${m.health === 'ok' ? '#6ee7b7' : '#fcd34d'}">${m.health === 'ok' ? '100%' : 'HOLD'}</div>
          <div class="note">${m.health === 'ok' ? 'semua follower sinkron' : 'entry baru ditahan sampai data segar'}</div>
        </div>
      </div>

      <div class="card">
        <div class="chead"><span class="tt">Follower dari master ini</span>
          <span class="sub">${fl.length} akun</span>
          <span class="r"><a class="btn sm" href="#/routing">Atur routing</a></span></div>
        <div class="fgrid">${fl.map(followerCard).join('')}</div>
      </div>

      <div class="card">
        <div class="chead"><span class="tt">Event terbaru</span><span class="sub">dari deal history (L2)</span>
          <span class="r"><a class="btn sm" href="#/log">Semua log</a></span></div>
        ${evs.map(eventRow).join('')}
      </div>`;
  };

  /* ---------- 4. FOLLOWER LIST ---------- */
  pages['followers'] = () => `
    <div class="head">
      <div><h1>Follower</h1>
        <p>${D.followers.length} akun eksekutor &middot; trading credential &middot; lintas broker</p></div>
      <div class="clock mono">02:14:37 WIB</div>
    </div>
    <div class="card">
      <div class="tbl">
        <table>
          <thead><tr>
            <th>Akun</th><th>Broker</th><th>Master</th><th>Map symbol</th><th>Volume rule</th>
            <th>Koneksi</th><th>Posisi</th><th>Latensi</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${D.followers.map(f => `
              <tr>
                <td><b>${esc(f.name)}</b><div class="sub mono">${esc(f.login)}</div></td>
                <td>${esc(f.broker)}</td>
                <td><a href="#/master/${f.master}" style="color:var(--cy)">Master ${esc(f.master)}</a></td>
                <td class="mono">${esc(f.map)}</td>
                <td>${esc(f.vol)}</td>
                <td><span class="fstat ${f.conn === 'online' ? 's-ok' : 's-bad'}">${f.conn === 'online' ? 'ONLINE' : 'PUTUS'}</span></td>
                <td class="mono">${f.open}</td>
                <td>${ms(f.latency)}</td>
                <td>${badge(f.status)}</td>
                <td><a class="btn sm" href="#/follower/${f.id}">Detail</a></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  /* ---------- 5. FOLLOWER DETAIL ---------- */
  pages['follower'] = (id) => {
    const f = D.followers.find(x => x.id === Number(id));
    if (!f) return notFound('Follower', id);
    const m = D.masters.find(x => x.id === f.master);
    const cfg = D.config;
    return `
      <div class="crumb"><a href="#/followers">Follower</a><span class="s">/</span><span>${esc(f.name)}</span></div>
      <div class="head">
        <div>
          <h1>${esc(f.name)}</h1>
          <p>${esc(f.broker)} &middot; <span class="mono">${esc(f.login)}</span> &middot; menyalin <a href="#/master/${f.master}" style="color:var(--cy)">Master ${esc(f.master)} (${esc(m.broker)})</a></p>
        </div>
        ${badge(f.status)}
      </div>

      <div class="g auto268">
        <div class="card stat">
          <div class="lab">Koneksi</div>
          <div class="val ${f.conn === 'online' ? 'gtext' : ''}" style="${f.conn === 'online' ? '' : 'color:#fda4af'}">
            ${f.conn === 'online' ? 'ONLINE' : 'PUTUS'}
          </div>
          <div class="note">terminal ${esc(f.conn === 'online' ? 'tersambung ke broker' : 'tidak tersambung')}</div>
          <div class="mstat">
            <div class="ms"><div class="n">${ms(f.latency)}</div><div class="t">Latensi</div></div>
            <div class="ms"><div class="n mono">${f.open}</div><div class="t">Posisi</div></div>
          </div>
        </div>

        <div class="card stat ${f.drift ? 'warnc' : ''}">
          <div class="lab">Drift</div>
          <div class="val mono" style="color:${f.drift ? '#fcd34d' : '#6ee7b7'}">${f.drift}</div>
          <div class="note">${f.allowed ? f.allowed + ' allowed (konfigurasi/broker)' : 'tidak ada allowed drift'}</div>
          <div style="margin-top:12px">
            <div class="bar"><i style="width:${f.drift ? 40 : 3}%;background:${f.drift ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#34d399,#22d3ee)'}"></i></div>
          </div>
        </div>

        <div class="card stat">
          <div class="lab">Sinkronisasi SL/TP</div>
          <div class="val" style="font-size:var(--fs-lg)">${esc(f.sltp)}</div>
          <div class="note">${f.note ? esc(f.note) : 'posisi follower cocok dengan master'}</div>
        </div>
      </div>

      <div class="g auto240">
        <div class="card">
          <div class="chead"><span class="tt">Konfigurasi copy</span></div>
          <div class="pad">
            <div class="kv"><span class="k">Map symbol</span><span class="v mono">${esc(f.map)}</span></div>
            <div class="kv"><span class="k">Volume rule</span><span class="v">${esc(f.vol)}</span></div>
            <div class="kv"><span class="k">Eksekusi</span><span class="v">${esc(cfg.execution)}</span></div>
            <div class="kv"><span class="k">SL/TP clamp</span><span class="v mono">${esc(cfg.sltpClamp)}</span></div>
            <div class="kv"><span class="k">Partial close</span><span class="v">${esc(cfg.partial)}</span></div>
            <div class="kv"><span class="k">Pending sync</span><span class="v">${esc(cfg.pending)}</span></div>
            <div class="kv"><span class="k">TTL instruksi</span><span class="v mono">${esc(cfg.ttl)}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="chead"><span class="tt">Aksi</span><span class="sub">butuh konfirmasi</span></div>
          <div class="pad" style="display:flex;flex-direction:column;gap:9px">
            <button class="btn pri" data-act="reconcile">Reconcile sekarang</button>
            <button class="btn" data-act="pause">Jeda follower ini</button>
            <button class="btn" data-act="detach">Lepas dari master</button>
            <button class="btn stop" data-act="stop">Hentikan paksa (stop)</button>
            <div class="note" style="font-size:var(--fs-xs);color:var(--dim2);margin-top:4px">
              Tombol ini belum terhubung ke backend &mdash; tahap ini hanya tampilan.
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="chead"><span class="tt">Riwayat sinkronisasi</span>
          <span class="r"><a class="btn sm" href="#/log">Event log</a></span></div>
        ${D.logs.map(l => `
          <div class="ev">
            <span class="ts mono">${l.t}</span>
            <span class="tag ${l.cls}">${l.tag}</span>
            <span class="msg">${l.msg}</span>
          </div>`).join('')}
      </div>`;
  };

  /* ---------- 6. ROUTING ---------- */
  pages['routing'] = () => {
    const m = D.masters;
    return `
      <div class="head">
        <div><h1>Routing</h1><p>Relasi master &rarr; follower bersifat eksplisit. Satu follower tidak boleh menerima dua instruksi untuk posisi yang sama.</p></div>
        <div class="clock mono">02:14:37 WIB</div>
      </div>

      <div class="card">
        <div class="chead"><span class="tt">Matriks routing</span><span class="sub">master &rarr; follower</span>
          <span class="r"><span class="chip gn">17 online</span><span class="chip rd">1 orphaned</span><span class="chip am">1 jeda</span></span></div>
        <div style="padding:0">
          ${m.map(mm => `
            <div style="padding:12px 15px;border-bottom:1px solid var(--bd)">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;flex-wrap:wrap">
                <span class="av ${mm.key.toLowerCase()}" style="width:30px;height:30px;border-radius:9px;font-size:12px">${esc(mm.key)}</span>
                <b>${esc(mm.name)} &mdash; ${esc(mm.broker)}</b>
                <span class="mono" style="font-size:var(--fs-xs);color:var(--dim2)">${esc(mm.login)}</span>
                <span style="margin-left:auto">${healthChip(mm.health)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${D.followers.filter(f => f.master === mm.id).map(f => `
                  <a href="#/follower/${f.id}" class="chip ${f.status === 'orphan' ? 'rd' : f.status === 'hold' ? 'am' : 'gray'}" style="font-weight:700">
                    ${esc(f.name.replace('Follower ', 'F'))} <span style="opacity:.7">${esc(f.map)}</span>
                  </a>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="chead"><span class="tt">Aturan aktif</span><span class="sub">${D.routingRules.length} relasi</span></div>
        <div class="tbl">
          <table>
            <thead><tr><th>Master</th><th>Follower</th><th>Map symbol</th><th>Volume rule</th><th>Status</th></tr></thead>
            <tbody>
              ${D.routingRules.map(r => {
                const f = D.followers.find(x => x.id === r.follower);
                const st = r.state === 'valid' ? ['VALID', 's-ok'] : r.state === 'hold' ? ['DITAHAN', 's-warn'] : ['ERROR', 's-bad'];
                return `<tr>
                  <td><a href="#/master/${r.master}" style="color:var(--cy)"><b>Master ${esc(r.master)}</b></a></td>
                  <td><a href="#/follower/${r.follower}"><b>${esc(f ? f.name : 'Follower ' + r.follower)}</b></a></td>
                  <td class="mono">${esc(r.map)}</td>
                  <td>${esc(r.vol)}</td>
                  <td><span class="fstat ${st[1]}">${st[0]}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="chead"><span class="tt">Aturan penyalinan</span><span class="sub">berlaku untuk semua follower kecuali dioverride</span></div>
        <div class="pad">
          <div class="kv"><span class="k">Open</span><span class="v">Disalin ke semua follower terdaftar</span></div>
          <div class="kv"><span class="k">Modify SL/TP</span><span class="v">Disalin &middot; di-clamp ke stops level broker tujuan</span></div>
          <div class="kv"><span class="k">Partial close</span><span class="v">Disalin &middot; dibedakan dari full close via volume + DEAL_POSITION_ID</span></div>
          <div class="kv"><span class="k">Full close</span><span class="v">Disalin ke semua follower yang punya posisi</span></div>
          <div class="kv"><span class="k">Pending order</span><span class="v">Disalin (placed / modified / cancelled / filled)</span></div>
          <div class="kv"><span class="k">Reversal (netting)</span><span class="v">Disalin &middot; DEAL_ENTRY_INOUT</span></div>
          <div class="kv"><span class="k">Close-by (hedging)</span><span class="v">Disalin &middot; DEAL_ENTRY_OUT_BY</span></div>
        </div>
      </div>`;
  };

  /* ---------- 7. EVENT LOG ---------- */
  pages['log'] = () => `
    <div class="head">
      <div><h1>Event Log</h1><p>Dua lapisan: L1 current state + L2 transaction history</p></div>
      <div class="clock mono">02:14:37 WIB</div>
    </div>

    <div class="g auto200">
      <div class="card stat"><div class="lab">Event / menit</div><div class="val mono">${D.summary.eventsPerMin}</div><div class="note">puncak 3 mnt: 61</div></div>
      <div class="card stat"><div class="lab">Deteksi</div><div class="val mono" style="color:#6ee7b7">L1+L2</div><div class="note">polling 250 ms</div></div>
      <div class="card stat"><div class="lab">Dibuang (stale)</div><div class="val mono" style="color:#fcd34d">${D.summary.staleDiscarded}</div><div class="note">TTL ${D.summary.ttl}</div></div>
      <div class="card stat"><div class="lab">Sync error</div><div class="val mono" style="color:#fda4af">${D.summary.syncErrors}</div><div class="note">butuh reconciliation</div></div>
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Event live</span><span class="sub">${D.events.length} baris terakhir</span>
        <span class="r"><span class="chip gn"><span class="live"></span>stream</span></span></div>
      ${D.events.map(eventRow).join('')}
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Reconciler &amp; drift</span><span class="sub">allowed vs sync error</span>
        <span class="r"><span class="chip">auto 10s</span></span></div>
      ${D.logs.map(l => `
        <div class="ev">
          <span class="ts mono">${l.t}</span>
          <span class="tag ${l.cls}">${l.tag}</span>
          <span class="msg">${l.msg}</span>
        </div>`).join('')}
    </div>`;

  /* ---------- 8. WORKERS ---------- */
  pages['workers'] = () => `
    <div class="head">
      <div><h1>Workers</h1><p>Windows cloud worker &mdash; 1 terminal per akun, folder /portable terpisah</p></div>
      <div class="clock mono">02:14:37 WIB</div>
    </div>

    <div class="g auto268">
      ${D.workers.map(w => `
        <div class="card stat">
          <div class="lab">${esc(w.id)} &middot; ${esc(w.role)}</div>
          <div class="val gtext" style="font-size:var(--fs-lg)">${esc(w.host)}</div>
          <div class="note">${esc(w.region)} &middot; ${esc(w.note)}</div>
          <div class="mstat">
            <div class="ms"><div class="n mono">${w.terminals}</div><div class="t">Terminal</div></div>
            <div class="ms"><div class="n mono">${esc(w.cpu)}</div><div class="t">CPU</div></div>
          </div>
          <div class="bar" style="margin-top:12px">
            <i style="width:${parseInt(w.ram) / parseFloat(w.ram.split('/')[1]) * 100}%;background:linear-gradient(90deg,#34d399,#22d3ee)"></i>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:var(--fs-xs);color:var(--dim2)">
            <span>RAM ${esc(w.ram)}</span><span>uptime ${esc(w.uptime)}</span>
          </div>
        </div>`).join('')}
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Health check</span><span class="sub">tiga pertanyaan berbeda</span></div>
      <div class="tbl">
        <table>
          <thead><tr><th>Worker</th><th>Host</th><th>Peran</th><th>Terminal</th><th>RAM</th><th>CPU</th><th>Restart</th><th>Uptime</th><th>Status</th></tr></thead>
          <tbody>
            ${D.workers.map(w => `
              <tr>
                <td><b>${esc(w.id)}</b></td>
                <td class="mono">${esc(w.host)}</td>
                <td>${esc(w.role)}</td>
                <td class="mono">${w.terminals}</td>
                <td class="mono">${esc(w.ram)}</td>
                <td class="mono">${esc(w.cpu)}</td>
                <td class="mono">${w.restarts}</td>
                <td class="mono">${esc(w.uptime)}</td>
                <td><span class="fstat s-ok">SEHAT</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Catatan kapasitas</span></div>
      <div class="pad">
        <div class="kv"><span class="k">Density</span><span class="v">Belum ditetapkan &mdash; menunggu benchmark (uji 1 &rarr; 5 &rarr; 10 &rarr; 20 terminal)</span></div>
        <div class="kv"><span class="k">Baseline RAM</span><span class="v">~0.75 GB / terminal (asumsi sementara, belum diukur)</span></div>
        <div class="kv"><span class="k">Provider</span><span class="v">Belum dipilih &mdash; menunggu benchmark &amp; verifikasi harga</span></div>
        <div class="kv"><span class="k">Provisioning</span><span class="v">Otomatis per akun (Task Scheduler + supervisor restart)</span></div>
      </div>
    </div>`;

  /* ---------- 9. KEAMANAN ---------- */
  pages['security'] = () => `
    <div class="head">
      <div><h1>Keamanan</h1><p>Kredensial follower adalah aset paling sensitif &mdash; perlakuan lebih keras dari master</p></div>
      <div class="clock mono">02:14:37 WIB</div>
    </div>

    <div class="g auto268">
      <div class="card stat">
        <div class="lab">Password plaintext</div>
        <div class="val gtext" style="font-size:var(--fs-lg)">TIDAK ADA</div>
        <div class="note">tidak ada penyimpanan plaintext permanen (plaintext sementara di memori saat auth tidak bisa dihindari)</div>
      </div>
      <div class="card stat">
        <div class="lab">Master credential</div>
        <div class="val gtext" style="font-size:var(--fs-lg)">INVESTOR</div>
        <div class="note">read-only, tidak bisa trading</div>
      </div>
      <div class="card stat">
        <div class="lab">Follower credential</div>
        <div class="val" style="font-size:var(--fs-lg);color:#fcd34d">TRADING</div>
        <div class="note">wajib punya hak transaksi &mdash; verifikasi terminologi per broker</div>
      </div>
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Kontrol keamanan</span><span class="sub">status implementasi</span></div>
      <div class="tbl">
        <table>
          <thead><tr><th>Kontrol</th><th>Keterangan</th><th>Status</th></tr></thead>
          <tbody>
            ${D.security.map(s => `
              <tr>
                <td><b>${esc(s.k)}</b></td>
                <td>${esc(s.v)}</td>
                <td><span class="fstat ${s.st === 'ok' ? 's-ok' : 's-warn'}">${s.st === 'ok' ? 'SIAP' : 'PENDING'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card warnc">
      <div class="chead"><span class="tt">Aturan keras</span></div>
      <div class="pad">
        <div class="kv"><span class="k">GitHub</span><span class="v">Tidak boleh ada kredensial di repo, log, atau backup terbuka</span></div>
        <div class="kv"><span class="k">Worker</span><span class="v">Hanya akses akun yang ditugaskan &mdash; least privilege</span></div>
        <div class="kv"><span class="k">Transport</span><span class="v">mTLS worker &harr; backend</span></div>
        <div class="kv"><span class="k">Dashboard</span><span class="v">MFA wajib untuk akun administratif</span></div>
      </div>
    </div>`;

  /* ---------- 10. PENGATURAN ---------- */
  pages['settings'] = () => `
    <div class="head">
      <div><h1>Pengaturan</h1><p>Parameter sistem &mdash; beberapa masih menunggu hasil PoC</p></div>
      <div class="clock mono">02:14:37 WIB</div>
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Parameter aktif</span><span class="sub">nilai yang berlaku sekarang</span></div>
      <div class="pad">
        ${D.settings.map(s => `
          <div class="kv"><span class="k">${esc(s.k)}</span><span class="v">${esc(s.v)}</span></div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="chead"><span class="tt">Yang belum boleh dikunci</span>
        <span class="r"><span class="chip am">menunggu PoC</span></span></div>
      <div class="tbl">
        <table>
          <thead><tr><th>Keputusan</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td><b>Konektor</b> &mdash; EA MQL5 vs Python vs hybrid</td><td><span class="fstat s-warn">PENDING POC</span></td></tr>
            <tr><td><b>Provider cloud</b> &mdash; Contabo / AWS / lain</td><td><span class="fstat s-warn">PENDING BENCHMARK</span></td></tr>
            <tr><td><b>Master hosting</b> &mdash; DIY VPS vs MQL5 Virtual Hosting</td><td><span class="fstat s-warn">PROVISIONAL (DIY)</span></td></tr>
            <tr><td><b>Batas latency produksi</b></td><td><span class="fstat s-warn">MENUNGGU DATA</span></td></tr>
            <tr><td><b>Teknologi backend</b> &mdash; queue, bahasa</td><td><span class="fstat s-warn">CONDITIONAL</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card badc">
      <div class="chead"><span class="tt">Status proyek</span></div>
      <div class="pad">
        <div class="kv"><span class="k">Fase</span><span class="v">Desain antarmuka &mdash; tampilan &amp; navigasi. Belum ada backend.</span></div>
        <div class="kv"><span class="k">PoC-1 observer</span><span class="v" style="color:#fda4af">BELUM DIJALANKAN &mdash; tidak ada hasil</span></div>
        <div class="kv"><span class="k">Production coding</span><span class="v">Belum diizinkan</span></div>
        <div class="kv"><span class="k">Deploy / beli cloud</span><span class="v">Belum diizinkan</span></div>
      </div>
    </div>`;

  /* ---------- 404 ---------- */
  function notFound(kind, id) {
    return `
      <div class="card badc">
        <div class="pad">
          <h2 style="font-size:var(--fs-lg);margin-bottom:8px">${esc(kind)} "${esc(id)}" tidak ditemukan</h2>
          <p style="color:var(--dim);font-size:var(--fs-sm);margin-bottom:14px">Alamat yang kamu buka tidak cocok dengan data yang tersedia.</p>
          <a class="btn pri" href="#/">Kembali ke Control Room</a>
        </div>
      </div>`;
  }

  function notFound404() {
    const { name } = parse();
    return `
      <div class="crumb"><a href="#/">Control Room</a><span class="s">/</span><span>404</span></div>
      <div class="card badc">
        <div class="pad">
          <h2 style="font-size:var(--fs-lg);margin-bottom:8px">Halaman tidak ditemukan</h2>
          <p style="color:var(--dim);font-size:var(--fs-sm);margin-bottom:14px">
            Route <span class="mono">#/${esc(name)}</span> tidak terdaftar. Gunakan menu di atas.
          </p>
          <a class="btn pri" href="#/">Kembali ke Control Room</a>
        </div>
      </div>`;
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  const NAV = [
    { id: 'control',  path: '#/',          label: 'Control Room' },
    { id: 'masters',  path: '#/masters',   label: 'Master',  badge: D.masters.length },
    { id: 'followers',path: '#/followers', label: 'Follower',badge: D.followers.length },
    { id: 'routing',  path: '#/routing',   label: 'Routing' },
    { id: 'log',      path: '#/log',       label: 'Event Log' },
    { id: 'workers',  path: '#/workers',   label: 'Workers', badge: D.workers.length },
    { id: 'security', path: '#/security',  label: 'Keamanan' },
    { id: 'settings', path: '#/settings',  label: 'Pengaturan' },
  ];

  function buildNav() {
    $('#nav').innerHTML = NAV.map(n =>
      `<a href="${n.path}" data-nav="${n.id}">${esc(n.label)}${n.badge != null ? `<span class="badge">${n.badge}</span>` : ''}</a>`
    ).join('');
  }

  function parse() {
    const raw = (location.hash || '#/').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || '', arg: parts[1] || null };
  }

  function render() {
    const { name, arg } = parse();
    const known = name === '' || Object.prototype.hasOwnProperty.call(pages, name);
    const fn = known ? pages[name] || pages[''] : notFound404;
    const admin = name === 'masters' || name === 'followers' ? 'masters' :
                  (name === 'master' ? 'masters' : name === 'follower' ? 'followers' : name);
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('on', a.dataset.nav === admin);
    });
    $('#view').innerHTML = fn(arg);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    document.title = 'NEXORA COPY HUB — ' + (NAV.find(n => n.id === admin)?.label || 'Control Room');
  }

  /* aksi tombol demo */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    alert('Aksi "' + b.dataset.act + '" belum terhubung ke backend.\nTahap ini hanya tampilan & navigasi.');
  });

  window.addEventListener('hashchange', render);

  /* boot */
  buildNav();
  if (!location.hash) location.hash = '#/';
  render();
})();
