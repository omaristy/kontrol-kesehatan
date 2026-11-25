/* Inti aplikasi: util, penyimpanan lokal, perhitungan gizi, analisis asam urat, sinkron Google Sheets. */
(function () {
  'use strict';
  const NA = (window.NA = window.NA || {});

  /* ---------- event emitter ---------- */
  const handlers = {};
  NA.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  NA.emit = function (ev) {
    const args = Array.prototype.slice.call(arguments, 1);
    (handlers[ev] || []).forEach(function (fn) { try { fn.apply(null, args); } catch (e) { console.error(e); } });
  };

  /* ---------- util ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const hm = function (d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const today = function () { return ymd(new Date()); };
  const parseYmd = function (s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = function (s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const toTs = function (date, time) {
    const p = date.split('-').map(Number);
    const t = (time || '00:00').split(':').map(Number);
    return new Date(p[0], p[1] - 1, p[2], t[0] || 0, t[1] || 0).getTime();
  };
  const uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  };
  const round = function (n, d) { const f = Math.pow(10, d || 0); return Math.round((+n || 0) * f) / f; };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const fmt = function (n, max) {
    return (+n || 0).toLocaleString('id-ID', { maximumFractionDigits: max == null ? 1 : max });
  };
  const dateLabel = function (s, short) {
    const t = today();
    if (!short) {
      if (s === t) return 'Hari ini';
      if (s === addDays(t, -1)) return 'Kemarin';
    }
    const d = parseYmd(s);
    const y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
    return (short ? '' : DAYS[d.getDay()] + ', ') + d.getDate() + ' ' + MONTHS[d.getMonth()] + y;
  };
  NA.u = { MONTHS: MONTHS, DAYS: DAYS, pad: pad, ymd: ymd, hm: hm, today: today, parseYmd: parseYmd, addDays: addDays, toTs: toTs, uid: uid, round: round, esc: esc, fmt: fmt, dateLabel: dateLabel };

  /* ---------- penyimpanan lokal ---------- */
  const KEY = 'catatan-asupan.v1';
  const NUT = ['kcal', 'p', 'c', 'f', 'fi', 's', 'pu', 'na', 'ch', 'sf'];
  const INT = { kcal: 1, pu: 1, na: 1, ch: 1 }; // nilai yang dibulatkan tanpa desimal
  NA.INT = INT;
  const DEF = {
    targets: { kcal: 2000, p: 60, c: 250, f: 65, fi: 25, s: 50, pu: 400, na: 2000, ch: 300, sf: 20, water: 8 },
    conn: { url: '', token: '', auto: true },
  };
  NA.NUT = NUT;

  const CFG = window.NA_CONFIG || {};
  function norm(o) {
    o = o || {};
    const conn = Object.assign({}, DEF.conn, o.conn);
    if (CFG.url && !conn.url) conn.url = CFG.url;
    if (CFG.token && !conn.token) conn.token = CFG.token;
    if (CFG.auto === false && !(o.conn && 'auto' in o.conn)) conn.auto = false;
    return {
      entries: o.entries || {},
      health: o.health || {},
      foods: o.foods || {},
      targets: Object.assign({}, DEF.targets, o.targets),
      conn: conn,
      sync: Object.assign({ lastServerAt: 0, lastPush: 0, lastOk: 0 }, o.sync),
    };
  }
  let db;
  try { const raw = localStorage.getItem(KEY); db = norm(raw ? JSON.parse(raw) : null); } catch (e) { db = norm(); }
  let ver = 0;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { NA.emit('error', 'Penyimpanan browser penuh atau diblokir. Data belum tersimpan.'); }
  }
  const live = function (kind) { return Object.keys(db[kind]).map(function (k) { return db[kind][k]; }).filter(function (r) { return !r.deleted; }); };

  function put(kind, rec) {
    rec.updatedAt = Date.now();
    db[kind][rec.id] = rec;
    ver++; save(); NA.emit('change', kind); scheduleSync();
    return rec;
  }
  function del(kind, id) {
    const r = db[kind][id]; if (!r) return;
    r.deleted = true; r.updatedAt = Date.now();
    ver++; save(); NA.emit('change', kind); scheduleSync();
  }
  function undel(kind, id) {
    const r = db[kind][id]; if (!r) return;
    r.deleted = false; r.updatedAt = Date.now();
    ver++; save(); NA.emit('change', kind); scheduleSync();
  }
  NA.db = { get: function () { return db; }, live: live, put: put, del: del, undel: undel, save: save };
  NA.targets = function () { return db.targets; };
  NA.setTargets = function (t) { Object.assign(db.targets, t); ver++; save(); NA.emit('change', 'targets'); };

  /* ---------- indeks per tanggal ---------- */
  let idxVer = -1, idx = null;
  function byDate() {
    if (idxVer !== ver) {
      idx = {};
      live('entries').forEach(function (e) { (idx[e.date] = idx[e.date] || []).push(e); });
      Object.keys(idx).forEach(function (k) { idx[k].sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; }); });
      idxVer = ver;
    }
    return idx;
  }
  const entriesOn = function (d) { return byDate()[d] || []; };
  const isWater = function (e) { return e.flag === 'air'; };
  const healthList = function () {
    return live('health').sort(function (a, b) { return toTs(b.date, b.time) - toTs(a.date, a.time); });
  };
  const healthOn = function (d) { return healthList().filter(function (h) { return h.date === d; }); };
  NA.q = { byDate: byDate, entriesOn: entriesOn, isWater: isWater, healthList: healthList, healthOn: healthOn };

  /* ---------- makanan ---------- */
  const BUILTIN = {};
  NA.FOODS.forEach(function (f) { BUILTIN[f.id] = f; });
  const allFoods = function () {
    return NA.FOODS.concat(live('foods').map(function (f) { return Object.assign({ custom: true }, f); }));
  };
  const foodById = function (id) {
    const c = db.foods[id];
    if (c && !c.deleted) return Object.assign({ custom: true }, c);
    return BUILTIN[id] || null;
  };
  NA.foods = { all: allFoods, byId: foodById };

  const level = function (pu100) { return pu100 > 150 ? 'high' : pu100 >= 50 ? 'mid' : 'low'; };
  NA.LV = { low: 'Rendah', mid: 'Sedang', high: 'Tinggi' };
  NA.level = level;
  NA.catName = function (k) { const c = NA.CATS.filter(function (x) { return x.k === k; })[0]; return c ? c.n : k; };

  function nutrients(food, grams) {
    const k = grams / 100, o = {};
    NUT.forEach(function (key) { o[key] = round((+food[key] || 0) * k, INT[key] ? 0 : 1); });
    return o;
  }
  function buildEntry(food, qty, unit, date, time, meal, id) {
    const grams = unit === 'g' ? qty : qty * food.pg;
    return Object.assign({
      id: id || uid(), date: date, time: time, meal: meal,
      foodId: food.id, name: food.name, cat: food.cat, flag: food.flag || '',
      qty: qty, unit: unit, grams: round(grams, 0), pg: food.pg, pl: food.pl, pu100: food.pu,
    }, nutrients(food, grams));
  }
  function sum(list) {
    const t = {}; NUT.forEach(function (k) { t[k] = 0; });
    list.forEach(function (e) { NUT.forEach(function (k) { t[k] += +e[k] || 0; }); });
    NUT.forEach(function (k) { t[k] = round(t[k], INT[k] ? 0 : 1); });
    return t;
  }
  const waterGlasses = function (d) {
    return round(entriesOn(d).filter(isWater).reduce(function (a, e) { return a + e.grams; }, 0) / 250, 1);
  };
  NA.calc = { nutrients: nutrients, buildEntry: buildEntry, sum: sum, waterGlasses: waterGlasses };

  NA.MEALS = [
    { k: 'sarapan', n: 'Sarapan', t: '07:00' },
    { k: 'siang', n: 'Makan siang', t: '12:30' },
    { k: 'malam', n: 'Makan malam', t: '19:00' },
    { k: 'camilan', n: 'Camilan', t: '16:00' },
  ];
  NA.mealByTime = function (t) {
    const h = +t.slice(0, 2) * 60 + +t.slice(3, 5);
    if (h < 10 * 60 + 30) return 'sarapan';
    if (h < 15 * 60 + 30) return 'siang';
    if (h < 21 * 60) return 'malam';
    return 'camilan';
  };

  /* status purin harian */
  NA.puStatus = function (total, limit, hasData) {
    if (!hasData) return { k: 'none', t: 'Belum ada catatan' };
    const r = limit > 0 ? total / limit : 0;
    if (r < 0.6) return { k: 'ok', t: 'Aman' };
    if (r <= 1) return { k: 'warn', t: 'Waspada' };
    return { k: 'bad', t: 'Melebihi batas' };
  };

  /* sumber purin terbesar dalam satu daftar entri */
  NA.topSources = function (list, n) {
    const m = {};
    list.forEach(function (e) {
      const k = e.foodId || e.name;
      const o = m[k] || (m[k] = { name: e.name, pu: 0, lvl: level(e.pu100) });
      o.pu += e.pu;
    });
    return Object.keys(m).map(function (k) { return m[k]; }).filter(function (o) { return o.pu > 0; })
      .sort(function (a, b) { return b.pu - a.pu; }).slice(0, n);
  };

  /* ---------- kondisi kesehatan ---------- */
  NA.KINDS = {
    nyeri: { cond: 'gout', n: 'Serangan asam urat' },
    lab: { cond: 'gout', n: 'Hasil lab asam urat' },
    tensi: { cond: 'tensi', n: 'Tekanan darah' },
    kolesterol: { cond: 'kolesterol', n: 'Kolesterol' },
    gula: { cond: 'gula', n: 'Gula darah' },
  };
  NA.condOf = function (h) { return (NA.KINDS[h.kind] || {}).cond || 'gout'; };
  const nz = function (v) { return +v || 0; };

  /* tingkat: 'high' | 'mid' | 'ok' (rujukan umum, bukan diagnosis) */
  NA.evLevel = function (h) {
    if (h.kind === 'nyeri') return 'high';
    if (h.kind === 'lab') { const u = nz(h.ua); return u >= 7 ? 'high' : u >= 6 ? 'mid' : 'ok'; }
    if (h.kind === 'tensi') {
      const s = nz(h.sys), d = nz(h.dia);
      return (s >= 140 || d >= 90) ? 'high' : (s >= 130 || d >= 80) ? 'mid' : 'ok';
    }
    if (h.kind === 'kolesterol') {
      const tc = nz(h.tc), ldl = nz(h.ldl), hdl = nz(h.hdl), tg = nz(h.tg);
      if (tc >= 240 || ldl >= 160 || tg >= 200 || (hdl > 0 && hdl < 40)) return 'high';
      if (tc >= 200 || ldl >= 130 || tg >= 150) return 'mid';
      return 'ok';
    }
    if (h.kind === 'gula') {
      const g = nz(h.glu);
      if (h.ctx === 'puasa') return g >= 126 ? 'high' : g >= 100 ? 'mid' : 'ok';
      return g >= 200 ? 'high' : g >= 140 ? 'mid' : 'ok';
    }
    return 'ok';
  };

  /* ---------- analisis pemicu ---------- */
  function riskScore(e) { // skor pemicu asam urat
    const w = NA.WEIGHT[e.cat] != null ? NA.WEIGHT[e.cat] : 1;
    const serv = e.pg ? e.grams / e.pg : 1;
    let s = (e.pu || 0) * w;
    if (e.flag === 'alk') s += 150 * serv;
    if (e.flag === 'manis') s += 60 * serv;
    return round(s, 0);
  }
  NA.riskScore = riskScore;

  NA.CONDS = {
    gout: { k: 'gout', n: 'Asam urat', key: 'pu', unit: 'mg', label: 'Purin', score: riskScore, chartLim: 7,
      logs: [['nyeri', 'Catat serangan'], ['lab', 'Catat hasil lab']] },
    tensi: { k: 'tensi', n: 'Tensi', key: 'na', unit: 'mg', label: 'Natrium', chartLim: 140,
      score: function (e) { return nz(e.na); }, logs: [['tensi', 'Catat tensi']] },
    kolesterol: { k: 'kolesterol', n: 'Kolesterol', key: 'sf', unit: 'g', label: 'Lemak jenuh', chartLim: 200,
      score: function (e) { return round(nz(e.sf) * 30 + nz(e.ch) * 0.5, 0); }, logs: [['kolesterol', 'Catat kolesterol']] },
    gula: { k: 'gula', n: 'Gula darah', key: 's', unit: 'g', label: 'Gula', chartLim: 126,
      score: function (e) { return round(nz(e.s) * 2 + nz(e.c) * 0.5, 0); }, logs: [['gula', 'Catat gula darah']] },
  };

  /* kejadian yang dianalisis: serangan nyeri (asam urat) atau hasil ukur yang tidak normal */
  const eventsOf = function (cond) {
    return healthList().filter(function (h) {
      return NA.condOf(h) === cond && (cond === 'gout' ? h.kind === 'nyeri' : NA.evLevel(h) !== 'ok');
    });
  };
  NA.q.eventsOf = eventsOf;

  function eventWindowDates(winDays, cond) {
    const set = {};
    eventsOf(cond).forEach(function (h) { for (let i = 0; i <= winDays; i++) set[addDays(h.date, -i)] = 1; });
    return set;
  }
  const entKey = function (e) { return e.foodId || ('n:' + String(e.name).toLowerCase()); };

  NA.analyze = function (ev, winDays, condKey) {
    const cond = NA.CONDS[condKey || 'gout'], key = cond.key, dec = INT[key] ? 0 : 1;
    const end = toTs(ev.date, ev.time);
    const days = [];
    for (let i = winDays; i >= 0; i--) {
      const d = addDays(ev.date, -i);
      let ents = entriesOn(d).filter(function (e) { return !isWater(e); });
      if (d === ev.date) ents = ents.filter(function (e) { return toTs(e.date, e.time) <= end; });
      days.push({ date: d, ents: ents, t: sum(ents), water: waterGlasses(d), back: i });
    }
    const all = [].concat.apply([], days.map(function (d) { return d.ents; }));
    const logged = days.filter(function (d) { return d.ents.length; });
    const total = sum(all);
    const avg = logged.length ? round(total[key] / logged.length, dec) : 0;
    const limit = NA.targets()[key] || 0;
    const overDays = logged.filter(function (d) { return limit > 0 && d.t[key] > limit; }).length;
    const avgOf = function (k) { return logged.length ? round(total[k] / logged.length, INT[k] ? 0 : 1) : 0; };

    const skip = eventWindowDates(winDays, condKey || 'gout');
    skip[ev.date] = 1;
    const idxAll = byDate();
    const baseDays = Object.keys(idxAll).filter(function (d) {
      return !skip[d] && idxAll[d].some(function (e) { return !isWater(e); });
    });
    const baseline = baseDays.length >= 3
      ? round(baseDays.reduce(function (a, d) { return a + sum(idxAll[d].filter(function (e) { return !isWater(e); }))[key]; }, 0) / baseDays.length, dec)
      : null;

    const map = {};
    all.forEach(function (e) {
      const k = entKey(e);
      const m = map[k] || (map[k] = { key: k, name: e.name, cat: e.cat, flag: e.flag, lvl: cond.k === 'gout' ? level(e.pu100) : null, count: 0, v: 0, score: 0, last: 0, lastEntry: null });
      const ts = toTs(e.date, e.time);
      m.count++; m.v += nz(e[key]); m.score += cond.score(e);
      if (ts >= m.last) { m.last = ts; m.lastEntry = e; }
    });
    const top = Object.keys(map).map(function (k) { return map[k]; })
      .filter(function (m) { return m.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    const scoreSum = top.reduce(function (a, m) { return a + m.score; }, 0) || 1;
    top.forEach(function (m) { m.share = m.score / scoreSum; m.v = round(m.v, dec); });

    const alk = all.filter(function (e) { return e.flag === 'alk'; });
    const sweet = all.filter(function (e) { return e.flag === 'manis'; });
    const waterAvg = logged.length ? round(logged.reduce(function (a, d) { return a + d.water; }, 0) / logged.length, 1) : null;

    return {
      days: days, total: total, avg: avg, baseline: baseline, top: top, hasData: all.length > 0,
      limit: limit, overDays: overDays, avgCh: avgOf('ch'), avgNa: avgOf('na'), avgSf: avgOf('sf'),
      alk: { n: alk.length, serv: round(alk.reduce(function (a, e) { return a + (e.pg ? e.grams / e.pg : 1); }, 0), 1) },
      sweet: { n: sweet.length, sugar: round(sweet.reduce(function (a, e) { return a + nz(e.s); }, 0), 0) },
      waterAvg: waterAvg, loggedDays: logged.length,
    };
  };

  /* Pola lintas kejadian: makanan yang sering muncul sebelum kejadian dibanding hari biasa */
  NA.patterns = function (winDays, condKey) {
    condKey = condKey || 'gout';
    const cond = NA.CONDS[condKey];
    const events = eventsOf(condKey);
    const idxAll = byDate();
    const logged = Object.keys(idxAll).filter(function (d) { return idxAll[d].some(function (e) { return !isWater(e); }); });
    const usable = events.filter(function (a) {
      for (let i = 0; i <= winDays; i++) { if ((idxAll[addDays(a.date, -i)] || []).some(function (e) { return !isWater(e); })) return true; }
      return false;
    });
    if (usable.length < 2) return { enough: false, attacks: events.length, usable: usable.length };

    const eaten = {}, meta = {};
    logged.forEach(function (d) {
      idxAll[d].forEach(function (e) {
        if (isWater(e)) return;
        const k = entKey(e);
        (eaten[k] = eaten[k] || {})[d] = 1;
        meta[k] = meta[k] || { name: e.name, cat: e.cat, flag: e.flag, lvl: cond.k === 'gout' ? level(e.pu100) : null, score: cond.score(e) };
      });
    });
    const inWin = function (k, endDate) {
      for (let i = 0; i <= winDays; i++) { if (eaten[k][addDays(endDate, -i)]) return true; }
      return false;
    };
    const out = [];
    Object.keys(eaten).forEach(function (k) {
      let hits = 0; usable.forEach(function (a) { if (inWin(k, a.date)) hits++; });
      if (hits < 2) return;
      let base = 0; logged.forEach(function (d) { if (inWin(k, d)) base++; });
      base = base / logged.length;
      const share = hits / usable.length;
      if (share < 0.5) return;
      out.push({ key: k, name: meta[k].name, cat: meta[k].cat, flag: meta[k].flag, lvl: meta[k].lvl, score: meta[k].score, hits: hits, total: usable.length, share: share, base: base, lift: base > 0 ? share / base : 99 });
    });
    out.sort(function (a, b) { return (b.lift * b.share * (1 + b.score / 200)) - (a.lift * a.share * (1 + a.score / 200)); });
    return { enough: true, attacks: events.length, usable: usable.length, list: out.slice(0, 8) };
  };

  /* ---------- sinkron Google Sheets ---------- */
  const KINDS = ['entries', 'health', 'foods'];
  let syncing = false, again = false, syncTimer = null;
  NA.syncState = { state: 'off', msg: '', at: 0 };
  const setSync = function (state, msg) { NA.syncState = { state: state, msg: msg || '', at: Date.now() }; NA.emit('sync'); };
  const configured = function () { return !!(db.conn.url && db.conn.token); };
  NA.sync = { configured: configured };

  async function post(payload) {
    const ctrl = new AbortController();
    const to = setTimeout(function () { ctrl.abort(); }, 45000);
    try {
      const r = await fetch(db.conn.url, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal, redirect: 'follow' });
      const txt = await r.text();
      try { return JSON.parse(txt); }
      catch (e) { throw new Error('Respons bukan JSON. Pastikan URL berakhiran /exec dan akses deployment diatur ke "Siapa saja".'); }
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Waktu habis. Periksa koneksi internet.');
      throw e;
    } finally { clearTimeout(to); }
  }

  NA.sync.test = async function () {
    if (!configured()) throw new Error('Isi URL dan token dulu.');
    const res = await post({ action: 'ping', token: db.conn.token });
    if (!res.ok) throw new Error(errText(res.error));
    return res;
  };
  function errText(code) {
    return ({
      TOKEN_SALAH: 'Token tidak cocok dengan yang ada di Apps Script.',
      TOKEN_BELUM_DIGANTI: 'Token di Apps Script belum diganti dari nilai bawaan.',
      SHEET_BELUM_SIAP: 'Jalankan fungsi setup di Apps Script terlebih dahulu.',
    })[code] || ('Server menolak: ' + code);
  }

  NA.sync.run = async function (opts) {
    opts = opts || {};
    if (!configured()) { setSync('off'); return false; }
    if (!navigator.onLine) { setSync('offline', 'Offline, akan sinkron saat tersambung'); return false; }
    if (syncing) { again = true; return false; }
    syncing = true; setSync('syncing');
    try {
      const startedAt = Date.now();
      const push = {};
      KINDS.forEach(function (k) {
        push[k] = Object.keys(db[k]).map(function (id) { return db[k][id]; }).filter(function (r) { return r.updatedAt > db.sync.lastPush; });
      });
      const res = await post({ action: 'sync', token: db.conn.token, since: db.sync.lastServerAt, push: push });
      if (!res.ok) throw new Error(errText(res.error));
      let changed = 0;
      KINDS.forEach(function (k) {
        ((res.pull && res.pull[k]) || []).forEach(function (r) {
          const cur = db[k][r.id];
          if (!cur || r.updatedAt > cur.updatedAt) { db[k][r.id] = r; changed++; }
        });
      });
      db.sync.lastServerAt = res.serverTime;
      db.sync.lastPush = startedAt;
      db.sync.lastOk = Date.now();
      if (changed) { ver++; }
      save();
      setSync('ok', 'Tersinkron');
      if (changed) NA.emit('remote-change');
      return true;
    } catch (e) {
      setSync('error', e.message || String(e));
      if (opts.throwOnError) throw e;
      return false;
    } finally {
      syncing = false;
      if (again) { again = false; scheduleSync(300); }
    }
  };
  function scheduleSync(ms) {
    if (!configured() || !db.conn.auto) { if (!configured()) setSync('off'); else setSync('pending', 'Belum disinkron'); return; }
    clearTimeout(syncTimer);
    setSync('pending', 'Menunggu sinkron…');
    syncTimer = setTimeout(function () { NA.sync.run(); }, ms == null ? 2500 : ms);
  }
  NA.sync.schedule = scheduleSync;
  NA.setConn = function (c) {
    Object.assign(db.conn, c); save();
    if (!configured()) setSync('off');
  };
  NA.fullResync = function () { db.sync.lastPush = 0; db.sync.lastServerAt = 0; save(); };
  window.addEventListener('online', function () { if (configured() && db.conn.auto) NA.sync.run(); });

  /* ---------- ekspor / impor ---------- */
  NA.exportJSON = function () {
    return JSON.stringify({ app: 'catatan-asupan', version: 1, exportedAt: new Date().toISOString(), targets: db.targets, entries: db.entries, health: db.health, foods: db.foods }, null, 1);
  };
  NA.importJSON = function (text) {
    const o = JSON.parse(text);
    if (!o || o.app !== 'catatan-asupan') throw new Error('Bukan file cadangan Catatan Asupan.');
    let n = 0;
    KINDS.forEach(function (k) {
      Object.keys(o[k] || {}).forEach(function (id) {
        const r = o[k][id]; const cur = db[k][id];
        if (r && r.id && (!cur || (r.updatedAt || 0) > cur.updatedAt)) { db[k][id] = r; n++; }
      });
    });
    if (o.targets) Object.assign(db.targets, o.targets);
    db.sync.lastPush = 0; ver++; save(); NA.emit('change', 'import'); scheduleSync();
    return n;
  };
  NA.exportCSV = function () {
    const head = ['Tanggal', 'Waktu', 'Sesi', 'Makanan', 'Jumlah', 'Satuan', 'Gram', 'Kalori (kkal)', 'Protein (g)', 'Karbo (g)', 'Lemak (g)', 'Serat (g)', 'Gula (g)', 'Purin (mg)', 'Lemak jenuh (g)', 'Natrium (mg)', 'Kolesterol (mg)'];
    const q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    const rows = live('entries').sort(function (a, b) { return toTs(a.date, a.time) - toTs(b.date, b.time); }).map(function (e) {
      return [e.date, e.time, e.meal, e.name, e.qty, e.unit === 'g' ? 'gram' : 'porsi', e.grams, e.kcal, e.p, e.c, e.f, e.fi, e.s, e.pu, e.sf, e.na, e.ch].map(q).join(',');
    });
    return '﻿' + head.map(q).join(',') + '\r\n' + rows.join('\r\n');
  };
  NA.wipe = function () {
    const conn = db.conn;
    db = norm(); db.conn = conn; ver++; save(); NA.emit('change', 'wipe');
  };
})();
