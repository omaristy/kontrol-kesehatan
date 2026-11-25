/* Tampilan, form, dan aksi. */
(function () {
  'use strict';
  const NA = window.NA;
  const U = NA.u, esc = U.esc, fmt = U.fmt;
  const q = NA.q, calc = NA.calc;
  const T = function () { return NA.targets(); };

  const S = (NA.S = {
    tab: 'today', date: U.today(),
    hMetric: 'pu', hRange: 14, hq: '',
    cond: 'gout', gEv: null, gWin: 3,
    fq: '', fLv: 'all', fCat: 'all',
    add: null,
  });
  NA.act = {}; NA.submit = {}; NA.live = {}; NA.bind = {};

  const JOINTS = ['Jempol kaki', 'Pergelangan kaki', 'Lutut', 'Tumit', 'Punggung kaki', 'Jari tangan', 'Pergelangan tangan', 'Siku', 'Lainnya'];
  const MACROS = [['kcal', 'Kalori', 'kkal'], ['p', 'Protein', 'g'], ['c', 'Karbo', 'g'], ['f', 'Lemak', 'g'], ['fi', 'Serat', 'g'], ['s', 'Gula', 'g']];

  const mealName = function (k) { const m = NA.MEALS.filter(function (x) { return x.k === k; })[0]; return m ? m.n : k; };
  const evTitle = function (h) {
    if (h.kind === 'lab') return 'Asam urat lab · ' + fmt(h.ua) + ' mg/dL';
    if (h.kind === 'tensi') return 'Tensi ' + h.sys + '/' + h.dia + (h.pulse ? ' · nadi ' + h.pulse : '');
    if (h.kind === 'kolesterol') {
      const bits = [];
      if (h.tc) bits.push('total ' + h.tc); if (h.ldl) bits.push('LDL ' + h.ldl); if (h.hdl) bits.push('HDL ' + h.hdl); if (h.tg) bits.push('trig ' + h.tg);
      return 'Kolesterol ' + bits.join(' · ');
    }
    if (h.kind === 'gula') return 'Gula darah ' + h.glu + ' mg/dL' + ({ puasa: ' (puasa)', pp: ' (2 jam setelah makan)', sewaktu: ' (sewaktu)' }[h.ctx] || '');
    return 'Serangan nyeri ' + h.pain + '/10' + (h.joint ? ' · ' + h.joint : '');
  };
  const lvTag = function (h) {
    const l = NA.evLevel(h);
    return '<span class="lv lv-' + (l === 'high' ? 'high' : l === 'mid' ? 'mid' : 'low') + '">' + (l === 'high' ? 'Tinggi' : l === 'mid' ? 'Waspada' : 'Baik') + '</span>';
  };
  const uaTag = function (ua) {
    if (ua >= 7) return '<span class="lv lv-high">Tinggi</span>';
    if (ua >= 6) return '<span class="lv lv-mid">Waspada</span>';
    return '<span class="lv lv-low">Baik</span>';
  };
  const qtyText = function (e) { return e.unit === 'g' ? fmt(e.qty) + ' g' : fmt(e.qty) + ' porsi · ' + fmt(e.grams, 0) + ' g'; };
  const puChip = function (e) { return '<span class="pu pu-' + NA.level(e.pu100) + '">' + fmt(e.pu, 0) + ' mg purin</span>'; };
  const emptyBox = function (title, text, btn) {
    return '<div class="empty"><b>' + esc(title) + '</b><p>' + esc(text) + '</p>' + (btn || '') + '</div>';
  };

  /* ====================== HARI INI ====================== */
  function viewToday() {
    const d = S.date, all = q.entriesOn(d), food = all.filter(function (e) { return !q.isWater(e); });
    const t = calc.sum(food), tg = T();
    const st = NA.puStatus(t.pu, tg.pu, food.length > 0);
    const top = NA.topSources(food, 3);
    const evs = q.healthOn(d);
    const isToday = d === U.today();

    let h = '<div class="datebar">' +
      '<button class="icon-btn" data-act="date-prev" aria-label="Hari sebelumnya">' + NA.icon('back') + '</button>' +
      '<label class="datepick"><span>' + esc(U.dateLabel(d)) + '</span><small>' + esc(U.dateLabel(d, true)) + '</small>' +
      '<input type="date" value="' + d + '" data-bind="date" aria-label="Pilih tanggal"></label>' +
      '<button class="icon-btn" data-act="date-next" aria-label="Hari berikutnya"' + (isToday ? ' disabled' : '') + '>' + NA.icon('next') + '</button>' +
      '</div>';
    if (!isToday) h += '<button class="chip-link" data-act="date-today">Kembali ke hari ini</button>';

    evs.forEach(function (ev) {
      const lvl = NA.evLevel(ev); if (lvl === 'ok') return;
      h += '<button class="banner ' + (lvl === 'high' ? 'bad' : 'mid') + '" data-act="goto-gout" data-id="' + esc(ev.id) + '">' + NA.icon('alert') +
        '<span><b>' + esc(evTitle(ev)) + '</b><small>Ketuk untuk menelusuri makanan sebelumnya</small></span></button>';
    });

    h += '<section class="card hero">' +
      '<div class="hero-top"><h2>Purin hari ini</h2><span class="pill st-' + st.k + '">' + st.t + '</span></div>' +
      NA.gauge(t.pu, tg.pu, st.k) +
      (top.length
        ? '<ul class="src">' + top.map(function (o) { return '<li><span>' + esc(o.name) + '</span><b>' + fmt(o.pu, 0) + ' mg</b></li>'; }).join('') + '</ul>'
        : '<p class="muted center">Catat makanan pertama hari ini untuk melihat sumber purinnya.</p>') +
      '</section>';

    h += '<section class="card"><div class="macros">' + MACROS.map(function (m) {
      const v = t[m[0]], target = tg[m[0]] || 0;
      const pct = target ? Math.min(v / target * 100, 100) : 0;
      const over = target && v > target * 1.1 && ['kcal', 'c', 'f', 's'].indexOf(m[0]) >= 0;
      return '<div class="macro"><div class="macro-h"><span>' + m[1] + '</span><b>' + fmt(v) + '<small> / ' + fmt(target, 0) + ' ' + m[2] + '</small></b></div>' +
        '<div class="bar-t"><i class="' + (over ? 'over' : '') + '" style="width:' + pct.toFixed(0) + '%"></i></div></div>';
    }).join('') + '</div></section>';

    h += '<section class="card"><h3>Tensi &amp; kolesterol</h3><div class="macros">' + [['na', 'Natrium', 'mg'], ['ch', 'Kolesterol', 'mg'], ['sf', 'Lemak jenuh', 'g']].map(function (m) {
      const v = t[m[0]], target = tg[m[0]] || 0, pct = target ? Math.min(v / target * 100, 100) : 0, over = target && v > target;
      return '<div class="macro"><div class="macro-h"><span>' + m[1] + '</span><b>' + fmt(v, NA.INT[m[0]] ? 0 : 1) + '<small> / ' + fmt(target, 0) + ' ' + m[2] + '</small></b></div>' +
        '<div class="bar-t"><i class="' + (over ? 'over' : '') + '" style="width:' + pct.toFixed(0) + '%"></i></div></div>';
    }).join('') + '</div></section>';

    const glasses = calc.waterGlasses(d), dots = Math.max(tg.water, Math.ceil(glasses));
    let wd = '';
    for (let i = 0; i < dots; i++) wd += '<i class="' + (i < Math.floor(glasses) ? 'on' : (i < glasses ? 'half' : '')) + '"></i>';
    h += '<section class="card water"><div><b>Air putih</b><small>' + fmt(glasses) + ' dari ' + tg.water + ' gelas · membantu membuang asam urat</small>' +
      '<div class="dots" aria-hidden="true">' + wd + '</div></div>' +
      '<div class="stepper"><button class="icon-btn" data-act="water-minus" aria-label="Kurangi satu gelas"' + (glasses <= 0 ? ' disabled' : '') + '>' + NA.icon('minus') + '</button>' +
      '<button class="icon-btn solid" data-act="water-plus" aria-label="Tambah satu gelas">' + NA.icon('plus') + '</button></div></section>';

    NA.MEALS.forEach(function (m) {
      const items = food.filter(function (e) { return e.meal === m.k; });
      const mt = calc.sum(items);
      h += '<section class="meal"><div class="meal-h"><h3>' + m.n + '</h3>' +
        (items.length ? '<span class="muted">' + fmt(mt.kcal, 0) + ' kkal · ' + fmt(mt.pu, 0) + ' mg purin</span>' : '') +
        '<button class="link" data-act="add-meal" data-meal="' + m.k + '">+ Tambah</button></div>';
      if (items.length) {
        h += '<div class="list">' + items.map(function (e) {
          return '<button class="row" data-act="edit-entry" data-id="' + esc(e.id) + '"><span class="row-main"><b>' + esc(e.name) + '</b><small>' + esc(qtyText(e)) + ' · ' + e.time + '</small></span>' +
            '<span class="row-side"><b>' + fmt(e.kcal, 0) + ' kkal</b>' + puChip(e) + '</span></button>';
        }).join('') + '</div>';
      } else {
        h += '<button class="ghost-row" data-act="add-meal" data-meal="' + m.k + '">Belum ada catatan ' + m.n.toLowerCase() + '</button>';
      }
      h += '</section>';
    });

    h += '<section class="card cta"><div><b>Merasa sakit atau habis cek kesehatan?</b><small>Catat asam urat, tensi, kolesterol, atau gula darah, lalu lihat makanan yang mungkin berpengaruh.</small></div>' +
      '<button class="btn warn" data-act="new-health" data-kind="nyeri">Catat</button></section>';
    h += '<button class="fab" data-act="add-meal" data-meal="" aria-label="Catat makanan">' + NA.icon('plus') + '<span>Catat makanan</span></button>';
    return h;
  }

  /* ====================== RIWAYAT ====================== */
  function histSearchHtml() {
    const term = S.hq.trim().toLowerCase();
    if (!term) return '';
    const tokens = term.split(/\s+/);
    const res = NA.db.live('entries').filter(function (e) {
      const n = e.name.toLowerCase(); return tokens.every(function (t) { return n.indexOf(t) >= 0; });
    }).sort(function (a, b) { return U.toTs(b.date, b.time) - U.toTs(a.date, a.time); });
    if (!res.length) return '<p class="muted center pad">Tidak ada catatan untuk "' + esc(S.hq) + '".</p>';
    return '<p class="muted pad-s">' + res.length + ' catatan ditemukan' + (res.length > 40 ? ', menampilkan 40 terbaru' : '') + '</p><div class="list">' +
      res.slice(0, 40).map(function (e) {
        return '<button class="row" data-act="open-day" data-date="' + e.date + '"><span class="row-main"><b>' + esc(e.name) + '</b><small>' + esc(U.dateLabel(e.date)) + ' · ' + e.time + ' · ' + esc(qtyText(e)) + '</small></span><span class="row-side">' + puChip(e) + '</span></button>';
      }).join('') + '</div>';
  }

  const HMETA = {
    pu: ['Purin', 'mg', 'gout'], na: ['Natrium', 'mg', 'tensi'], ch: ['Kolesterol', 'mg', 'kolesterol'], sf: ['Lemak jenuh', 'g', 'kolesterol'],
    s: ['Gula', 'g', 'gula'], kcal: ['Kalori', 'kkal', null], p: ['Protein', 'g', null], c: ['Karbo', 'g', null],
  };
  const LIMITED = { pu: 1, na: 1, ch: 1, sf: 1, s: 1 };

  function viewHistory() {
    const tg = T(), metric = S.hMetric, range = S.hRange;
    const m = HMETA[metric], lim = tg[metric] || 0, dec = NA.INT[metric] ? 0 : 1;
    const markDates = {};
    q.healthList().forEach(function (hh) {
      if (NA.evLevel(hh) === 'ok') return;
      if (!m[2] || NA.condOf(hh) === m[2]) markDates[hh.date] = 1;
    });
    const today = U.today();
    const data = [], rows = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = U.addDays(today, -i);
      const food = q.entriesOn(d).filter(function (e) { return !q.isWater(e); });
      const t = calc.sum(food);
      data.push({ date: d, v: t[metric], label: U.dateLabel(d, true), tick: String(U.parseYmd(d).getDate()), mark: !!markDates[d], dim: !food.length });
      if (food.length) rows.push({ d: d, t: t, ev: !!markDates[d] });
    }
    const withData = rows.length;
    const avg = withData ? rows.reduce(function (a, r) { return a + r.t[metric]; }, 0) / withData : 0;
    const overDays = LIMITED[metric] ? rows.filter(function (r) { return r.t[metric] > lim; }).length : 0;

    let h = '<div class="chips scroll" role="group" aria-label="Pilih ukuran">' + ['pu', 'na', 'ch', 'sf', 's', 'kcal', 'p', 'c'].map(function (k) {
      return '<button class="chip ' + (metric === k ? 'on' : '') + '" data-act="h-metric" data-v="' + k + '">' + HMETA[k][0] + '</button>';
    }).join('') + '</div>' + NA.seg('h-range', range, [[7, '7 hari'], [14, '14 hari'], [30, '30 hari']]) + '<div class="gap"></div>';
    h += '<section class="card"><div class="stat-row"><div><small>Rata-rata per hari</small><b>' + fmt(avg, 0) + ' <em>' + m[1] + '</em></b></div>' +
      '<div><small>Hari tercatat</small><b>' + withData + '<em>/' + range + '</em></b></div>' +
      (LIMITED[metric] ? '<div><small>Lewat batas</small><b class="' + (overDays ? 'tx-bad' : '') + '">' + overDays + '<em> hari</em></b></div>' : '') + '</div>' +
      NA.barChart({ data: data, limit: LIMITED[metric] || metric === 'kcal' ? lim : 0, unit: m[1], aria: m[0] + ' per hari, ' + range + ' hari terakhir' }) +
      '<p class="legend"><i class="lg bar"></i>' + m[0] + (LIMITED[metric] || metric === 'kcal' ? ' <i class="lg lim"></i>Target ' + fmt(lim, 0) + ' ' + m[1] : '') + ' <i class="lg mk"></i>Catatan kesehatan tidak normal</p></section>';

    h += '<div class="searchbox">' + NA.icon('search') + '<input type="search" id="hq" placeholder="Cari: kapan terakhir makan…" value="' + esc(S.hq) + '" data-bind="hq" autocomplete="off"></div>';
    h += '<div id="hist-results">' + histSearchHtml() + '</div>';

    if (!S.hq.trim()) {
      if (!withData) {
        h += emptyBox('Belum ada catatan di ' + range + ' hari terakhir', 'Mulai dari tab Hari Ini, lalu riwayatnya muncul di sini.');
      } else {
        h += '<div class="list">' + rows.slice().reverse().map(function (r) {
          const st = LIMITED[metric] ? NA.puStatus(r.t[metric], lim, true) : null;
          return '<button class="row" data-act="open-day" data-date="' + r.d + '"><span class="row-main"><b>' + esc(U.dateLabel(r.d)) + '</b><small>' + fmt(r.t.kcal, 0) + ' kkal · P ' + fmt(r.t.p) + ' · K ' + fmt(r.t.c) + ' · L ' + fmt(r.t.f) + (r.ev ? ' · <span class="tx-bad">ada catatan kesehatan</span>' : '') + '</small></span>' +
            '<span class="row-side"><b>' + fmt(r.t[metric], dec) + ' ' + m[1] + '</b>' + (st ? '<span class="pill st-' + st.k + '">' + st.t + '</span>' : '') + '</span></button>';
        }).join('') + '</div>';
      }
    }
    return h;
  }

  /* ====================== KESEHATAN ====================== */
  const CONDS_UI = ['gout', 'tensi', 'kolesterol', 'gula'];
  const COND_TXT = {
    gout: {
      title: 'Telusuri penyebab asam urat', intro: 'Catat saat nyeri muncul atau setelah cek lab. Aplikasi menelusuri makanan sebelum kejadian, lalu mencari pola dari serangan ke serangan.',
      emptyT: 'Belum ada catatan asam urat', emptyP: 'Catat serangan nyeri atau hasil lab. Setelah itu makanan sebelum kejadian dianalisis di sini.',
      series: 'Purin per hari sebelum kejadian', limLabel: 'Batas harian', noun: 'serangan',
      foot: 'Skor pemicu menimbang purin hewani (jeroan, daging, seafood) penuh, purin nabati lebih ringan, serta menambah poin untuk alkohol dan minuman manis. Ini petunjuk, bukan diagnosis.',
      ref: 'Rujukan umum kadar asam urat: pria sampai 7 mg/dL, wanita sampai 6 mg/dL. Penderita gout biasanya diarahkan di bawah 6 mg/dL. Ikuti target dari dokter Anda.',
    },
    tensi: {
      title: 'Telusuri pemicu tensi tinggi', intro: 'Catat hasil ukur tensi. Aplikasi menghitung natrium (garam) dari makanan beberapa hari sebelumnya dan sumber terbesarnya.',
      emptyT: 'Belum ada catatan tensi', emptyP: 'Catat hasil ukur tensi Anda. Natrium dari makanan sebelum pengukuran akan dianalisis di sini.',
      series: 'Natrium per hari sebelum pengukuran', limLabel: 'Batas harian', noun: 'pengukuran tinggi',
      foot: 'Skor pemicu pada tensi adalah jumlah natrium dari makanan tersebut. Makanan olahan, ikan asin, kerupuk, dan mie instan biasanya paling tinggi. Ini petunjuk, bukan diagnosis.',
      ref: 'Rujukan umum: normal di bawah 120/80 mmHg, waspada 130/80, tinggi 140/90 atau lebih (pada pengukuran berulang). Ikuti anjuran dokter Anda.',
    },
    kolesterol: {
      title: 'Telusuri pemicu kolesterol', intro: 'Catat hasil cek kolesterol. Aplikasi menghitung lemak jenuh dan kolesterol makanan sebelumnya dan sumber terbesarnya.',
      emptyT: 'Belum ada catatan kolesterol', emptyP: 'Catat hasil cek kolesterol Anda. Makanan sebelum pengukuran akan dianalisis di sini.',
      series: 'Lemak jenuh per hari sebelum pengukuran', limLabel: 'Batas harian', noun: 'pengukuran tinggi',
      foot: 'Skor pemicu menimbang lemak jenuh (lebih berat) dan kolesterol dari makanan. Hasil lab kolesterol dipengaruhi kebiasaan makan berminggu-minggu, jadi lihat juga pola jangka panjang. Ini petunjuk, bukan diagnosis.',
      ref: 'Rujukan umum: kolesterol total di bawah 200 mg/dL, LDL di bawah 130 (idealnya di bawah 100), HDL di atas 40, trigliserida di bawah 150. Ikuti anjuran dokter Anda.',
    },
    gula: {
      title: 'Telusuri pemicu gula darah', intro: 'Catat hasil cek gula darah. Aplikasi menghitung gula dan karbohidrat dari makanan sebelumnya dan sumber terbesarnya.',
      emptyT: 'Belum ada catatan gula darah', emptyP: 'Catat hasil cek gula darah Anda. Makanan sebelum pengukuran akan dianalisis di sini.',
      series: 'Gula per hari sebelum pengukuran', limLabel: 'Batas harian', noun: 'pengukuran tinggi',
      foot: 'Skor pemicu menimbang gula (lebih berat) dan karbohidrat. Gula darah sesaat sangat dipengaruhi makanan beberapa jam sebelumnya, jadi periksa juga jam makannya. Ini petunjuk, bukan diagnosis.',
      ref: 'Rujukan umum: gula puasa normal di bawah 100 mg/dL, 126 atau lebih menandakan diabetes; 2 jam setelah makan normal di bawah 140, 200 atau lebih tinggi. Ikuti anjuran dokter Anda.',
    },
  };
  const mainVal = function (h) { return +({ nyeri: h.ua, lab: h.ua, tensi: h.sys, kolesterol: h.tc || h.ldl || h.tg, gula: h.glu }[h.kind]) || 0; };
  const chipText = function (e) {
    const d = U.dateLabel(e.date, true);
    if (e.kind === 'nyeri') return d + ' · Nyeri ' + e.pain;
    if (e.kind === 'lab') return d + ' · Lab ' + fmt(e.ua);
    if (e.kind === 'tensi') return d + ' · ' + e.sys + '/' + e.dia;
    if (e.kind === 'kolesterol') return d + ' · ' + (e.tc ? 'Total ' + e.tc : e.ldl ? 'LDL ' + e.ldl : e.tg ? 'Trig ' + e.tg : 'HDL ' + e.hdl);
    return d + ' · ' + e.glu;
  };

  function viewGout() {
    const tg = T(), ck = S.cond, cond = NA.CONDS[ck], tx = COND_TXT[ck];
    const evs = q.healthList().filter(function (e) { return NA.condOf(e) === ck; });
    if (!evs.some(function (e) { return e.id === S.gEv; })) {
      const first = evs.filter(function (e) { return e.kind === 'nyeri'; })[0] || evs[0];
      S.gEv = first ? first.id : null;
    }
    let h = '<div class="chips grid2c" role="group" aria-label="Pilih kondisi">' + CONDS_UI.map(function (k) {
      return '<button class="chip ' + (k === ck ? 'on' : '') + '" data-act="cond-select" data-v="' + k + '">' + NA.CONDS[k].n + '</button>';
    }).join('') + '</div>';
    h += '<section class="card hero-g"><h2>' + tx.title + '</h2><p>' + tx.intro + '</p><div class="btn-row">' + cond.logs.map(function (l, i) {
      return '<button class="btn ' + (i === 0 ? 'warn' : 'ghost') + '" data-act="new-health" data-kind="' + l[0] + '">' + l[1] + '</button>';
    }).join('') + '</div></section>';

    if (!evs.length) return h + emptyBox(tx.emptyT, tx.emptyP);

    h += '<label class="field"><span>Catatan yang dianalisis (' + evs.length + ')</span><select data-bind="gev">' + evs.map(function (e) {
      return '<option value="' + esc(e.id) + '"' + (e.id === S.gEv ? ' selected' : '') + '>' + esc(chipText(e)) + (NA.evLevel(e) === 'high' ? ' · tinggi' : '') + '</option>';
    }).join('') + '</select></label>';

    const ev = evs.filter(function (e) { return e.id === S.gEv; })[0];
    const A = NA.analyze(ev, S.gWin, ck), dec = NA.INT[cond.key] ? 0 : 1;

    const series = evs.slice(0, 12).reverse().filter(function (e) { return mainVal(e) > 0; });
    if (series.length >= 2) {
      h += '<section class="card"><h3>Hasil ukur terakhir</h3>' + NA.barChart({
        data: series.map(function (e) { return { date: e.date, v: mainVal(e), label: U.dateLabel(e.date, true), tick: String(U.parseYmd(e.date).getDate()) }; }),
        limit: cond.chartLim, unit: ck === 'tensi' ? 'mmHg (atas)' : 'mg/dL', aria: 'Hasil ukur ' + cond.n
      }) + '<p class="foot">Garis putus-putus adalah batas atas normal umum.</p></section>';
    }

    h += '<section class="card"><div class="card-h"><div><h3>' + esc(evTitle(ev)) + ' ' + (ev.kind === 'nyeri' ? '' : lvTag(ev)) + '</h3><small class="muted">' + esc(U.dateLabel(ev.date)) + ' · ' + ev.time + (ev.kind === 'nyeri' && ev.ua ? ' · lab ' + fmt(ev.ua) + ' mg/dL' : '') + '</small></div>' +
      '<button class="link" data-act="edit-health" data-id="' + esc(ev.id) + '">Ubah</button></div>' +
      (ev.note ? '<p class="note">' + esc(ev.note) + '</p>' : '') +
      '<div class="field-l">Lihat makanan sebelum kejadian</div>' +
      NA.seg('g-win', S.gWin, [[1, '1 hari'], [2, '2 hari'], [3, '3 hari'], [5, '5 hari'], [7, '7 hari']]) + '</section>';

    if (!A.hasData) {
      h += emptyBox('Belum ada catatan makan di rentang ini', 'Tidak ada makanan tercatat pada ' + S.gWin + ' hari sebelum kejadian. Coba perluas rentang, atau tambahkan catatan untuk tanggal tersebut.',
        '<button class="btn" data-act="open-day" data-date="' + ev.date + '">Buka tanggal ' + esc(U.dateLabel(ev.date, true)) + '</button>');
    } else {
      const ratio = A.baseline ? A.avg / A.baseline : null;
      h += '<section class="card"><h3>' + tx.series + '</h3><div class="stat-row">' +
        '<div><small>Rata-rata</small><b class="' + (A.avg > A.limit ? 'tx-bad' : '') + '">' + fmt(A.avg, 0) + '<em> ' + cond.unit + '/hari</em></b></div>' +
        '<div><small>Hari biasa</small><b>' + (A.baseline != null ? fmt(A.baseline, 0) : '–') + '<em>' + (A.baseline != null ? ' ' + cond.unit + '/hari' : '') + '</em></b></div>' +
        '<div><small>' + tx.limLabel + '</small><b>' + fmt(A.limit, 0) + '<em> ' + cond.unit + '</em></b></div></div>' +
        NA.barChart({
          data: A.days.map(function (d) { return { date: d.date, v: d.t[cond.key], label: U.dateLabel(d.date, true), tick: d.back === 0 ? 'H' : 'H-' + d.back, dim: !d.ents.length }; }),
          limit: A.limit, unit: cond.unit, aria: tx.series
        }) +
        '<p class="summary">' + (ratio ? cond.label + ' di rentang ini <b>' + fmt(ratio, 1) + '×</b> dibanding hari biasa. ' : (A.baseline == null ? 'Belum cukup hari biasa tercatat untuk perbandingan. ' : '')) +
        (A.avg > A.limit ? 'Rata-ratanya <b class="tx-bad">melewati batas harian</b>.' : 'Rata-ratanya masih di bawah batas harian.') + '</p></section>';

      h += '<section class="card"><h3>Pemicu yang paling mungkin</h3><div class="list flat">' + A.top.slice(0, 6).map(function (m) {
        const e = m.lastEntry;
        return '<div class="row s"><span class="row-main"><b>' + esc(m.name) + '</b> ' + (m.lvl ? NA.lvBadge(m.lvl) : '') +
          (m.flag === 'alk' ? ' <span class="lv lv-high">Alkohol</span>' : '') + (m.flag === 'manis' ? ' <span class="lv lv-mid">Manis</span>' : '') +
          '<small>' + m.count + '× dalam rentang · terakhir ' + esc(U.dateLabel(e.date)) + ' ' + e.time + '</small>' +
          '<span class="bar-t thin"><i style="width:' + Math.max(4, Math.round(m.share * 100)) + '%"></i></span></span>' +
          '<span class="row-side"><b>' + fmt(m.v, dec) + ' ' + cond.unit + '</b><small>' + Math.round(m.share * 100) + '% skor</small></span></div>';
      }).join('') + '</div><p class="foot">' + tx.foot + '</p></section>';

      const notes = [];
      if (A.overDays) notes.push(['bad', cond.label + ' melewati batas di ' + A.overDays + ' dari ' + A.loggedDays + ' hari', 'Batas harian Anda ' + fmt(A.limit, 0) + ' ' + cond.unit + '. Ubah di menu Setelan bila perlu.']);
      if ((ck === 'gout' || ck === 'tensi') && A.alk.n) notes.push(['bad', 'Alkohol: ' + fmt(A.alk.serv) + ' porsi', ck === 'gout' ? 'Alkohol, terutama bir, menghambat pembuangan asam urat.' : 'Alkohol dapat menaikkan tekanan darah.']);
      if ((ck === 'gout' || ck === 'gula') && A.sweet.n) notes.push(['mid', 'Minuman manis: ' + A.sweet.n + '× (gula ' + fmt(A.sweet.sugar, 0) + ' g)', ck === 'gout' ? 'Fruktosa dari minuman manis dapat menaikkan kadar asam urat.' : 'Minuman manis menaikkan gula darah dengan cepat.']);
      if (ck === 'gout' && A.waterAvg != null && A.waterAvg < tg.water * 0.6) notes.push(['mid', 'Air putih rata-rata ' + fmt(A.waterAvg) + ' gelas/hari', 'Kurang dari target ' + tg.water + ' gelas. Cairan membantu ginjal membuang asam urat.']);
      if (ck === 'kolesterol' && A.avgCh > tg.ch) notes.push(['mid', 'Kolesterol makanan rata-rata ' + fmt(A.avgCh, 0) + ' mg/hari', 'Di atas batas ' + fmt(tg.ch, 0) + ' mg. Jeroan, kuning telur, dan seafood tertentu paling tinggi.']);
      if (ck === 'tensi' && A.avgNa > tg.na * 1.5) notes.push(['bad', 'Natrium rata-rata ' + fmt(A.avgNa, 0) + ' mg/hari', 'Lebih dari 1,5 kali batas. Kurangi makanan asin, olahan, dan kuah.']);
      if (notes.length) {
        h += '<section class="card"><h3>Faktor lain</h3><div class="list flat">' + notes.map(function (n) {
          return '<div class="note-row n-' + n[0] + '"><b>' + esc(n[1]) + '</b><small>' + esc(n[2]) + '</small></div>';
        }).join('') + '</div></section>';
      }

      h += '<section class="card"><h3>Semua yang dimakan</h3>' + A.days.slice().reverse().map(function (d) {
        return '<details' + (d.back === 0 || d.back === 1 ? ' open' : '') + '><summary><span>' + esc(U.dateLabel(d.date)) + '</span><b>' + fmt(d.t[cond.key], dec) + ' ' + cond.unit + '</b></summary>' +
          (d.ents.length ? '<div class="list flat">' + d.ents.map(function (e) {
            return '<div class="row s"><span class="row-main"><b>' + esc(e.name) + '</b><small>' + e.time + ' · ' + esc(mealName(e.meal)) + ' · ' + esc(qtyText(e)) + '</small></span><span class="row-side"><span class="pu pu-mid">' + fmt(e[cond.key], dec) + ' ' + cond.unit + '</span></span></div>';
          }).join('') + '</div>' : '<p class="muted pad-s">Tidak ada catatan.</p>') + '</details>';
      }).join('') + '</section>';
    }

    const P = NA.patterns(S.gWin, ck);
    h += '<section class="card"><h3>Pola dari semua kejadian</h3>';
    if (!P.enough) {
      h += '<p class="muted">' + (P.attacks < 2 ? 'Catat minimal 2 ' + tx.noun + ' agar pola bisa dicari.' : 'Belum cukup ' + tx.noun + ' yang punya catatan makan (' + P.usable + ' dari ' + P.attacks + ').') + ' Makin banyak catatan, makin jelas polanya.</p>';
    } else if (!P.list.length) {
      h += '<p class="muted">Dari ' + P.usable + ' ' + tx.noun + ', belum ada makanan yang berulang muncul sebelum kejadian dalam rentang ' + S.gWin + ' hari.</p>';
    } else {
      h += '<p class="muted">Makanan yang berulang muncul ' + S.gWin + ' hari sebelum kejadian (dari ' + P.usable + ' ' + tx.noun + '):</p><div class="list flat">' + P.list.map(function (m) {
        return '<div class="row s"><span class="row-main"><b>' + esc(m.name) + '</b> ' + (m.lvl ? NA.lvBadge(m.lvl) : '') + '<small>Hari biasa ' + Math.round(m.base * 100) + '% dari hari tercatat</small></span>' +
          '<span class="row-side"><b>' + m.hits + ' dari ' + m.total + '</b><small>' + tx.noun + '</small></span></div>';
      }).join('') + '</div>';
    }
    h += '</section>';

    h += '<section class="card"><h3>Riwayat ' + cond.n.toLowerCase() + '</h3><div class="list flat">' + evs.map(function (e) {
      return '<button class="row s" data-act="edit-health" data-id="' + esc(e.id) + '"><span class="row-main"><b>' + esc(evTitle(e)) + '</b><small>' + esc(U.dateLabel(e.date)) + ' · ' + e.time + (e.note ? ' · ' + esc(e.note.slice(0, 40)) : '') + '</small></span>' +
        '<span class="row-side">' + (e.kind === 'nyeri' ? '' : lvTag(e)) + '</span></button>';
    }).join('') + '</div><p class="foot">' + tx.ref + '</p></section>';
    return h;
  }

  /* ====================== MAKANAN ====================== */
  function matchFoods(term, lv, cat) {
    const tokens = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = NA.foods.all().filter(function (f) {
      if (lv && lv !== 'all' && NA.level(f.pu) !== lv) return false;
      if (cat && cat !== 'all' && f.cat !== cat) return false;
      const n = f.name.toLowerCase();
      return tokens.every(function (t) { return n.indexOf(t) >= 0; });
    });
    const first = tokens[0];
    list.sort(function (a, b) {
      if (first) { const sa = a.name.toLowerCase().indexOf(first) === 0 ? 0 : 1, sb = b.name.toLowerCase().indexOf(first) === 0 ? 0 : 1; if (sa !== sb) return sa - sb; }
      return a.name.localeCompare(b.name, 'id');
    });
    return list;
  }
  function foodRow(f, act) {
    const k = f.pg / 100;
    return '<button class="row" data-act="' + act + '" data-id="' + esc(f.id) + '"><span class="row-main"><b>' + esc(f.name) + (f.custom ? ' <span class="tag">Buatan Anda</span>' : '') + '</b>' +
      '<small>' + esc(f.pl) + ' (' + f.pg + ' g) · ' + fmt(f.kcal * k, 0) + ' kkal</small></span>' +
      '<span class="row-side">' + NA.lvBadge(NA.level(f.pu)) + '<small>' + fmt(f.pu * k, 0) + ' mg / porsi</small></span></button>';
  }
  function foodsResultsHtml() {
    const list = matchFoods(S.fq, S.fLv, S.fCat);
    if (!list.length) return emptyBox('Makanan tidak ditemukan', 'Coba kata lain, atau tambahkan sendiri.', '<button class="btn" data-act="new-food">Tambah makanan</button>');
    return '<div class="list">' + list.map(function (f) { return foodRow(f, 'food-detail'); }).join('') + '</div>';
  }
  function viewFoods() {
    return '<div class="searchbox">' + NA.icon('search') + '<input type="search" value="' + esc(S.fq) + '" placeholder="Cari makanan…" data-bind="fq" autocomplete="off"></div>' +
      '<div class="chips scroll">' + [['all', 'Semua purin'], ['low', 'Purin rendah'], ['mid', 'Sedang'], ['high', 'Tinggi']].map(function (o) {
        return '<button class="chip ' + (S.fLv === o[0] ? 'on' : '') + '" data-act="food-lv" data-v="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>' +
      '<label class="field"><span>Kategori</span><select data-bind="food-cat">' + [{ k: 'all', n: 'Semua kategori' }].concat(NA.CATS).map(function (c) {
        return '<option value="' + c.k + '"' + (S.fCat === c.k ? ' selected' : '') + '>' + esc(c.n) + '</option>';
      }).join('') + '</select></label>' +
      '<p class="foot pad-s">Purin per 100 g: rendah di bawah 50 mg, sedang 50–150 mg, tinggi di atas 150 mg. Nilai adalah perkiraan.</p>' +
      '<div id="food-results">' + foodsResultsHtml() + '</div>' +
      '<button class="btn block" data-act="new-food">+ Tambah makanan sendiri</button>';
  }

  /* ====================== SETELAN ====================== */
  const isStandalone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone; };
  function syncText() {
    const s = NA.syncState, last = NA.db.get().sync.lastOk;
    const when = last ? 'Terakhir berhasil: ' + U.dateLabel(U.ymd(new Date(last)), true) + ' ' + U.hm(new Date(last)) : 'Belum pernah sinkron';
    const map = { off: 'Belum terhubung ke Google Sheets', syncing: 'Sedang sinkron…', ok: 'Tersinkron. ' + when, pending: 'Ada perubahan yang menunggu sinkron. ' + when, offline: 'Offline. ' + when, error: 'Gagal: ' + s.msg };
    return map[s.state] || when;
  }
  function viewSettings() {
    const tg = T(), c = NA.db.get().conn;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let h = '<section class="card"><h3>Target harian</h3><form data-form="targets" class="grid2">' + [
      ['kcal', 'Kalori (kkal)'], ['p', 'Protein (g)'], ['c', 'Karbo (g)'], ['f', 'Lemak (g)'], ['fi', 'Serat (g)'], ['s', 'Gula (g)'], ['pu', 'Batas purin (mg)'], ['na', 'Batas natrium (mg)'], ['sf', 'Batas lemak jenuh (g)'], ['ch', 'Batas kolesterol (mg)'], ['water', 'Air putih (gelas)']
    ].map(function (f) {
      return '<label class="field"><span>' + f[1] + '</span><input type="number" name="' + f[0] + '" inputmode="decimal" min="0" step="any" value="' + tg[f[0]] + '" required></label>';
    }).join('') + '<p class="foot span2">Penderita asam urat umumnya dianjurkan membatasi purin sekitar 300–400 mg per hari. Natrium: WHO menyarankan di bawah 2.000 mg/hari (sekitar 1 sendok teh garam), penderita tensi tinggi sering dianjurkan 1.500 mg. Kolesterol makanan umumnya di bawah 300 mg dan lemak jenuh sekitar 10% kalori. Tanyakan batas yang tepat untuk Anda ke dokter atau ahli gizi.</p>' +
      '<button class="btn span2" type="submit">Simpan target</button></form></section>';

    h += '<section class="card"><h3>Google Sheets</h3><p class="muted">Data tetap tersimpan di HP ini dan otomatis dicadangkan ke Google Sheet Anda.</p>' +
      '<form data-form="conn"><label class="field"><span>URL Web App (berakhiran /exec)</span><input type="url" name="url" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(c.url) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<label class="field"><span>Token (kata sandi yang Anda tulis di Apps Script)</span><input type="password" name="token" value="' + esc(c.token) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<label class="check"><input type="checkbox" name="auto"' + (c.auto ? ' checked' : '') + '> Sinkron otomatis setelah setiap perubahan</label>' +
      '<div class="btn-row"><button class="btn" type="submit" data-act="conn-save">Simpan & tes koneksi</button>' +
      '<button class="btn ghost" type="button" data-act="sync-now">Sinkron sekarang</button></div></form>' +
      '<p class="status s-' + NA.syncState.state + '" id="sync-status">' + esc(syncText()) + '</p></section>';

    h += '<section class="card"><h3>Pasang aplikasi</h3>';
    if (isStandalone()) h += '<p class="muted">Aplikasi sudah terpasang di perangkat ini.</p>';
    else if (NA.installEvt) h += '<p class="muted">Pasang agar muncul di layar utama dan bisa dibuka tanpa browser.</p><button class="btn" data-act="install-app">Pasang di perangkat ini</button>';
    else if (ios) h += '<p class="muted">Di iPhone/iPad: buka lewat Safari, ketuk tombol Bagikan, lalu pilih <b>Tambahkan ke Layar Utama</b>.</p>';
    else h += '<p class="muted">Di Chrome Android: ketuk menu titik tiga, lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</p>';
    h += '</section>';

    h += '<section class="card"><h3>Data</h3><div class="btn-col">' +
      '<button class="btn ghost" data-act="export-csv">Ekspor CSV (untuk Excel)</button>' +
      '<button class="btn ghost" data-act="export-json">Simpan cadangan (JSON)</button>' +
      '<label class="btn ghost file">Pulihkan dari cadangan<input type="file" accept="application/json,.json" data-bind="import"></label>' +
      '<button class="btn ghost" data-act="full-resync">Kirim ulang semua data ke Sheet</button>' +
      '<button class="btn danger" data-act="wipe">Hapus semua data di perangkat ini</button></div></section>';

    h += '<section class="card"><h3>Tentang</h3><p class="muted">Catatan Asupan v1.0. Nilai gizi dan purin adalah perkiraan rata-rata dari tabel umum dan dapat berbeda dari masakan Anda. Aplikasi ini alat bantu pencatatan, bukan pengganti saran dokter.</p></section>';
    return h;
  }

  /* ====================== RENDER ====================== */
  const VIEWS = { today: viewToday, history: viewHistory, gout: viewGout, foods: viewFoods, settings: viewSettings };
  NA.render = function () {
    const view = document.getElementById('view');
    const y = window.scrollY;
    view.innerHTML = VIEWS[S.tab]();
    document.querySelectorAll('.tabs button').forEach(function (b) {
      const on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false');
    });
    document.getElementById('page-title').textContent = { today: 'Catatan Asupan', history: 'Riwayat', gout: 'Kesehatan', foods: 'Makanan', settings: 'Setelan' }[S.tab];
    return y;
  };
  NA.go = function (tab) { S.tab = tab; NA.render(); window.scrollTo(0, 0); };

  /* ====================== SHEET: CATAT MAKANAN ====================== */
  function recentFoods() {
    const seen = {}, out = [];
    NA.db.live('entries').sort(function (a, b) { return U.toTs(b.date, b.time) - U.toTs(a.date, a.time); }).forEach(function (e) {
      if (out.length >= 8 || seen[e.foodId] || q.isWater(e)) return;
      seen[e.foodId] = 1; const f = NA.foods.byId(e.foodId); if (f) out.push(f);
    });
    return out;
  }
  function addResultsHtml() {
    const a = S.add;
    const term = a.q.trim();
    const list = matchFoods(term, 'all', a.cat).filter(function (f) { return f.flag !== 'air'; });
    let h = '';
    if (!term && a.cat === 'all') {
      const rec = recentFoods();
      if (rec.length) h += '<div class="group-h">Terakhir dimakan</div><div class="list">' + rec.map(function (f) { return foodRow(f, 'add-pick'); }).join('') + '</div><div class="group-h">Semua makanan</div>';
    }
    if (!list.length) return h + emptyBox('Tidak ditemukan', 'Coba kata lain atau tambahkan makanan sendiri.');
    return h + '<div class="list">' + list.map(function (f) { return foodRow(f, 'add-pick'); }).join('') + '</div>';
  }
  function pickHtml() {
    const a = S.add;
    return '<div class="sheet-head"><h2>' + (a.editId ? 'Ubah catatan' : 'Catat makanan') + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Tutup">' + NA.icon('close') + '</button></div>' +
      '<div class="searchbox">' + NA.icon('search') + '<input type="search" value="' + esc(a.q) + '" placeholder="Cari: nasi, ayam, tempe…" data-bind="add-q" autocomplete="off"></div>' +
      '<label class="field"><span>Kategori</span><select data-bind="add-cat">' + [{ k: 'all', n: 'Semua kategori' }].concat(NA.CATS).map(function (c) {
        return '<option value="' + c.k + '"' + (a.cat === c.k ? ' selected' : '') + '>' + esc(c.n) + '</option>';
      }).join('') + '</select></label><div id="add-results">' + addResultsHtml() + '</div>' +
      '<button class="btn ghost block" data-act="add-new-food">Makanan belum ada? Tambah sendiri</button>';
  }
  function foodForEntry(e) {
    const f = NA.foods.byId(e.foodId);
    if (f) return f;
    const k = e.grams > 0 ? 100 / e.grams : 0;
    return { id: e.foodId, name: e.name, cat: e.cat, flag: e.flag, pg: e.pg || 100, pl: e.pl || '1 porsi', pu: e.pu100 || 0, kcal: e.kcal * k, p: e.p * k, c: e.c * k, f: e.f * k, fi: e.fi * k, s: e.s * k, na: (e.na || 0) * k, ch: (e.ch || 0) * k, sf: (e.sf || 0) * k };
  }
  const curFood = function () { return S.add.food; };

  function previewHtml(food, qty, unit) {
    const grams = unit === 'g' ? qty : qty * food.pg;
    const n = calc.nutrients(food, grams), tg = T();
    const lv = NA.level(food.pu);
    const tiles = [['kcal', 'Kalori', 'kkal'], ['p', 'Protein', 'g'], ['c', 'Karbo', 'g'], ['f', 'Lemak', 'g'], ['fi', 'Serat', 'g'], ['s', 'Gula', 'g'], ['sf', 'Lemak jenuh', 'g'], ['na', 'Natrium', 'mg'], ['ch', 'Kolesterol', 'mg']].map(function (m) {
      return '<div><small>' + m[1] + '</small><b>' + fmt(n[m[0]], NA.INT[m[0]] ? 0 : 1) + '</b><em>' + m[2] + '</em></div>';
    }).join('');
    return '<div class="pv-grid">' + tiles + '</div><div class="pv-pu pu-' + lv + '"><span><small>Purin</small><b>' + fmt(n.pu, 0) + ' mg</b></span><span>' + Math.round(n.pu / (tg.pu || 1) * 100) + '% dari batas harian</span></div>';
  }
  function portionHtml() {
    const a = S.add, f = curFood(), lv = NA.level(f.pu);
    return '<div class="sheet-head"><button class="icon-btn" data-act="add-back" aria-label="Kembali ke daftar">' + NA.icon('back') + '</button><h2>' + esc(f.name) + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Tutup">' + NA.icon('close') + '</button></div>' +
      '<div class="meta-row">' + NA.lvBadge(lv) + '<span class="muted">Purin ' + fmt(f.pu, 0) + ' mg / 100 g</span>' +
      (f.flag === 'alk' ? '<span class="lv lv-high">Alkohol</span>' : '') + (f.flag === 'manis' ? '<span class="lv lv-mid">Manis</span>' : '') + '</div>' +
      '<form data-form="entry" data-live="entry"><div class="qty"><button type="button" class="icon-btn" data-act="qty-minus" aria-label="Kurangi">' + NA.icon('minus') + '</button>' +
      '<input type="number" name="qty" inputmode="decimal" min="0.01" step="any" value="' + a.qty + '" required aria-label="Jumlah">' +
      '<button type="button" class="icon-btn" data-act="qty-plus" aria-label="Tambah">' + NA.icon('plus') + '</button></div>' +
      NA.seg('unit', a.unit, [['porsi', 'Porsi'], ['g', 'Gram']]) +
      '<p class="foot center" id="pv-hint"></p><div id="pv">' + previewHtml(f, a.qty, a.unit) + '</div>' +
      '<div class="grid3"><label class="field"><span>Tanggal</span><input type="date" name="date" value="' + a.date + '" required></label>' +
      '<label class="field"><span>Jam</span><input type="time" name="time" value="' + a.time + '" required></label>' +
      '<label class="field"><span>Waktu makan</span><select name="meal">' + NA.MEALS.map(function (m) { return '<option value="' + m.k + '"' + (m.k === a.meal ? ' selected' : '') + '>' + m.n + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="btn-row"><button class="btn" type="submit">' + (a.editId ? 'Simpan perubahan' : 'Simpan') + '</button>' +
      (a.editId ? '<button class="btn danger-o" type="button" data-act="delete-entry">Hapus</button>' : '') + '</div></form>';
  }
  function updateHint() {
    const a = S.add, f = curFood(), el = document.getElementById('pv-hint'); if (!el) return;
    const form = document.querySelector('form[data-form="entry"]');
    const qv = parseFloat(form.elements.qty.value) || 0;
    el.textContent = a.unit === 'g' ? 'Sekitar ' + fmt(qv / f.pg, 2) + ' porsi (1 porsi = ' + f.pl + ', ' + f.pg + ' g)' : '1 porsi = ' + f.pl + ' (' + f.pg + ' g) · total ' + fmt(qv * f.pg, 0) + ' g';
  }
  function readPortion() {
    const form = document.querySelector('form[data-form="entry"]'); if (!form) return;
    const a = S.add;
    a.qty = parseFloat(form.elements.qty.value) || a.qty; a.date = form.elements.date.value || a.date; a.time = form.elements.time.value || a.time; a.meal = form.elements.meal.value;
  }
  function showPortion() { NA.sheet.set(portionHtml()); updateHint(); }
  function defaultTime(date, meal) {
    if (date === U.today()) return U.hm(new Date());
    const m = NA.MEALS.filter(function (x) { return x.k === meal; })[0];
    return m ? m.t : '12:00';
  }

  NA.openAdd = function (meal, editId) {
    let a;
    if (editId) {
      const e = NA.db.get().entries[editId]; if (!e) return;
      a = { step: 'portion', q: '', cat: 'all', food: foodForEntry(e), qty: e.qty, unit: e.unit, date: e.date, time: e.time, meal: e.meal, editId: editId };
    } else {
      const time = defaultTime(S.date, meal);
      a = { step: 'pick', q: '', cat: 'all', food: null, qty: 1, unit: 'porsi', date: S.date, time: time, meal: meal || NA.mealByTime(time), editId: null };
    }
    S.add = a;
    NA.sheet.open(a.step === 'pick' ? pickHtml() : portionHtml());
    if (a.step === 'portion') updateHint();
  };

  NA.act['add-meal'] = function (el) { NA.openAdd(el.dataset.meal || ''); };
  NA.act['edit-entry'] = function (el) { NA.openAdd(null, el.dataset.id); };
  NA.act['add-cat'] = function (el) { S.add.cat = el.dataset.v; NA.sheet.set(pickHtml()); };
  NA.act['add-pick'] = function (el) {
    const f = NA.foods.byId(el.dataset.id); if (!f) return;
    S.add.food = f; S.add.step = 'portion'; S.add.qty = 1; S.add.unit = 'porsi'; showPortion();
  };
  NA.act['add-back'] = function () {
    if (S.add.editId) { NA.sheet.close(); return; }
    readPortion(); S.add.step = 'pick'; NA.sheet.set(pickHtml());
  };
  NA.bind['add-q'] = function (el) { S.add.q = el.value; document.getElementById('add-results').innerHTML = addResultsHtml(); };
  NA.act['qty-plus'] = function () { stepQty(1); };
  NA.act['qty-minus'] = function () { stepQty(-1); };
  function stepQty(dir) {
    const form = document.querySelector('form[data-form="entry"]');
    const step = S.add.unit === 'g' ? 10 : 0.5;
    const v = Math.max(step, Math.round(((parseFloat(form.elements.qty.value) || 0) + dir * step) * 100) / 100);
    form.elements.qty.value = v; NA.live.entry(form);
  }
  NA.act.unit = function (el) {
    readPortion();
    const a = S.add, f = a.food, to = el.dataset.v;
    if (to === a.unit) return;
    a.qty = to === 'g' ? Math.round(a.qty * f.pg) : Math.round(a.qty / f.pg * 100) / 100;
    a.unit = to; showPortion();
  };
  NA.live.entry = function (form) {
    const a = S.add, qv = parseFloat(form.elements.qty.value) || 0;
    document.getElementById('pv').innerHTML = previewHtml(a.food, qv, a.unit);
    updateHint();
  };
  NA.submit.entry = function (form) {
    if (!form.reportValidity()) return;
    readPortion();
    const a = S.add, qv = parseFloat(form.elements.qty.value);
    if (!(qv > 0)) return;
    const rec = calc.buildEntry(a.food, qv, a.unit, a.date, a.time, a.meal, a.editId);
    NA.db.put('entries', rec);
    NA.sheet.close();
    S.date = a.date; S.tab = 'today'; NA.render();
    NA.toast(a.editId ? 'Perubahan disimpan' : rec.name + ' tercatat');
  };
  NA.act['delete-entry'] = function () {
    const id = S.add.editId; NA.db.del('entries', id); NA.sheet.close(); NA.render();
    NA.toast('Catatan dihapus', { label: 'Urungkan', fn: function () { NA.db.undel('entries', id); NA.render(); } });
  };
  NA.act['water-plus'] = function () {
    const f = NA.foods.byId('air-putih'), now = new Date(), d = S.date;
    const time = d === U.today() ? U.hm(now) : '12:00';
    NA.db.put('entries', calc.buildEntry(f, 1, 'porsi', d, time, NA.mealByTime(time)));
    NA.render();
  };
  NA.act['water-minus'] = function () {
    const w = q.entriesOn(S.date).filter(q.isWater); if (!w.length) return;
    NA.db.del('entries', w[w.length - 1].id); NA.render();
  };

  /* ====================== SHEET: KESEHATAN ====================== */
  const KIND_OPTS = [['nyeri', 'Serangan asam urat (nyeri)'], ['lab', 'Hasil lab asam urat'], ['tensi', 'Tekanan darah'], ['kolesterol', 'Kolesterol'], ['gula', 'Gula darah']];
  function applyKinds(form) {
    const kind = form.elements.kind.value;
    form.querySelectorAll('[data-kinds]').forEach(function (el) { el.hidden = el.dataset.kinds.split(' ').indexOf(kind) < 0; });
  }
  NA.openHealth = function (kind, id) {
    const e = id ? NA.db.get().health[id] : null;
    const now = new Date();
    const v = Object.assign({ kind: kind || 'nyeri', date: U.ymd(now), time: U.hm(now), pain: 5, joint: 'Jempol kaki', ua: '', sys: '', dia: '', pulse: '', tc: '', ldl: '', hdl: '', tg: '', glu: '', ctx: 'puasa', note: '' }, e || {});
    const val = function (x) { return x == null ? '' : x; };
    const numF = function (name, label, step, ph) { return '<label class="field"><span>' + label + '</span><input type="number" name="' + name + '" inputmode="decimal" min="0" step="' + (step || 'any') + '" value="' + val(v[name]) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></label>'; };
    NA.sheet.open('<div class="sheet-head"><h2>' + (e ? 'Ubah catatan' : 'Catat kesehatan') + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Tutup">' + NA.icon('close') + '</button></div>' +
      '<form data-form="health" data-live="health" data-id="' + (e ? esc(e.id) : '') + '">' +
      '<label class="field"><span>Jenis catatan</span><select name="kind">' + KIND_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v.kind ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<div class="grid2"><label class="field"><span>Tanggal</span><input type="date" name="date" value="' + v.date + '" required></label>' +
      '<label class="field"><span>Jam</span><input type="time" name="time" value="' + v.time + '" required></label></div>' +
      '<div data-kinds="nyeri"><label class="field"><span>Tingkat nyeri: <b id="pain-v">' + (v.pain || 5) + '</b>/10</span><input type="range" name="pain" min="1" max="10" step="1" value="' + (v.pain || 5) + '"></label>' +
      '<label class="field"><span>Lokasi</span><select name="joint">' + JOINTS.map(function (j) { return '<option' + (j === v.joint ? ' selected' : '') + '>' + j + '</option>'; }).join('') + '</select></label></div>' +
      '<div data-kinds="nyeri lab">' + numF('ua', 'Kadar asam urat (mg/dL), wajib untuk hasil lab', '0.1', 'mis. 7,8') + '</div>' +
      '<div data-kinds="tensi"><div class="grid2">' + numF('sys', 'Atas / sistolik (mmHg)', '1', 'mis. 140') + numF('dia', 'Bawah / diastolik (mmHg)', '1', 'mis. 90') + '</div>' + numF('pulse', 'Nadi (opsional)', '1', 'mis. 78') + '</div>' +
      '<div data-kinds="kolesterol"><div class="grid2">' + numF('tc', 'Kolesterol total (mg/dL)', '1') + numF('ldl', 'LDL (mg/dL)', '1') + numF('hdl', 'HDL (mg/dL)', '1') + numF('tg', 'Trigliserida (mg/dL)', '1') + '</div><p class="foot">Isi yang ada di hasil lab Anda. Minimal satu.</p></div>' +
      '<div data-kinds="gula">' + numF('glu', 'Gula darah (mg/dL)', '1', 'mis. 110') + '<label class="field"><span>Kapan diukur</span><select name="ctx"><option value="puasa"' + (v.ctx === 'puasa' ? ' selected' : '') + '>Puasa (8 jam tidak makan)</option><option value="pp"' + (v.ctx === 'pp' ? ' selected' : '') + '>2 jam setelah makan</option><option value="sewaktu"' + (v.ctx === 'sewaktu' ? ' selected' : '') + '>Sewaktu</option></select></label></div>' +
      '<label class="field"><span>Catatan</span><textarea name="note" rows="2" maxlength="300" placeholder="Opsional, mis. pusing setelah bangun tidur">' + esc(v.note || '') + '</textarea></label>' +
      '<div class="btn-row"><button class="btn" type="submit">Simpan</button>' + (e ? '<button class="btn danger-o" type="button" data-act="delete-health" data-id="' + esc(e.id) + '">Hapus</button>' : '') + '</div></form>');
    applyKinds(document.querySelector('form[data-form="health"]'));
  };
  NA.act['new-health'] = function (el) { NA.openHealth(el.dataset.kind); };
  NA.act['edit-health'] = function (el) { NA.openHealth(null, el.dataset.id); };
  NA.live.health = function (form) {
    applyKinds(form);
    const pv = document.getElementById('pain-v'); if (pv) pv.textContent = form.elements.pain.value;
  };
  NA.submit.health = function (form) {
    const E = form.elements, kind = E.kind.value;
    const n = function (k) { const x = parseFloat(String(E[k].value).replace(',', '.')); return x > 0 ? x : null; };
    const rec = { id: form.dataset.id || U.uid(), kind: kind, date: E.date.value, time: E.time.value, pain: 0, joint: '', ua: null, sys: null, dia: null, pulse: null, tc: null, ldl: null, hdl: null, tg: null, glu: null, ctx: '', note: E.note.value.trim() };
    if (!rec.date || !rec.time) { NA.toast('Isi tanggal dan jam.'); return; }
    const need = function (ok, field, msg) { if (!ok) { E[field].focus(); NA.toast(msg); } return ok; };
    if (kind === 'nyeri') { rec.pain = parseInt(E.pain.value, 10); rec.joint = E.joint.value; rec.ua = n('ua'); }
    else if (kind === 'lab') { rec.ua = n('ua'); if (!need(rec.ua, 'ua', 'Isi kadar asam urat dari hasil lab.')) return; }
    else if (kind === 'tensi') {
      rec.sys = n('sys'); rec.dia = n('dia'); rec.pulse = n('pulse');
      if (!need(rec.sys, 'sys', 'Isi angka tensi atas.') || !need(rec.dia, 'dia', 'Isi angka tensi bawah.')) return;
    } else if (kind === 'kolesterol') {
      rec.tc = n('tc'); rec.ldl = n('ldl'); rec.hdl = n('hdl'); rec.tg = n('tg');
      if (!need(rec.tc || rec.ldl || rec.hdl || rec.tg, 'tc', 'Isi minimal satu nilai kolesterol.')) return;
    } else if (kind === 'gula') {
      rec.glu = n('glu'); rec.ctx = E.ctx.value;
      if (!need(rec.glu, 'glu', 'Isi kadar gula darah.')) return;
    }
    NA.db.put('health', rec);
    S.cond = NA.condOf(rec); S.gEv = rec.id; NA.sheet.close();
    if (S.tab === 'today') { S.date = rec.date; }
    NA.go('gout');
    NA.toast(kind === 'nyeri' ? 'Tercatat. Berikut makanan sebelum kejadian.' : 'Hasil tercatat');
  };
  NA.act['delete-health'] = function (el) {
    const id = el.dataset.id; NA.db.del('health', id); NA.sheet.close(); NA.render();
    NA.toast('Catatan dihapus', { label: 'Urungkan', fn: function () { NA.db.undel('health', id); NA.render(); } });
  };
  NA.act['gout-select'] = function (el) { S.gEv = el.dataset.id; NA.render(); };
  NA.act['cond-select'] = function (el) { S.cond = el.dataset.v; S.gEv = null; NA.render(); };
  NA.act['g-win'] = function (el) { S.gWin = +el.dataset.v; NA.render(); };
  NA.act['goto-gout'] = function (el) {
    const h = NA.db.get().health[el.dataset.id];
    S.gEv = el.dataset.id; if (h) S.cond = NA.condOf(h);
    NA.go('gout');
  };

  /* ====================== SHEET: MAKANAN BUATAN SENDIRI ====================== */
  NA.openFoodForm = function (id, back) {
    const f = id ? NA.db.get().foods[id] : null;
    const v = f || { name: '', cat: 'masakan', kcal: '', p: '', c: '', f: '', fi: '', s: '', pu: '', pl: '1 porsi', pg: 100, flag: '' };
    const numOpt = function (name, label) { return '<label class="field"><span>' + label + '</span><input type="number" name="' + name + '" inputmode="decimal" min="0" step="any" value="' + (v[name] == null ? 0 : v[name]) + '"></label>'; };
    const num = function (name, label) { return '<label class="field"><span>' + label + '</span><input type="number" name="' + name + '" inputmode="decimal" min="0" step="any" value="' + v[name] + '" required></label>'; };
    NA.sheet.open('<div class="sheet-head"><h2>' + (f ? 'Ubah makanan' : 'Makanan baru') + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Tutup">' + NA.icon('close') + '</button></div>' +
      '<form data-form="food" data-id="' + (f ? esc(f.id) : '') + '" data-back="' + (back || '') + '">' +
      '<label class="field"><span>Nama makanan</span><input type="text" name="name" value="' + esc(v.name) + '" maxlength="60" required></label>' +
      '<label class="field"><span>Kategori</span><select name="cat">' + NA.CATS.map(function (c) { return '<option value="' + c.k + '"' + (c.k === v.cat ? ' selected' : '') + '>' + esc(c.n) + '</option>'; }).join('') + '</select></label>' +
      '<div class="group-h">Kandungan per 100 gram</div><div class="grid2">' + num('kcal', 'Kalori (kkal)') + num('p', 'Protein (g)') + num('c', 'Karbo (g)') + num('f', 'Lemak (g)') + num('fi', 'Serat (g)') + num('s', 'Gula (g)') + numOpt('sf', 'Lemak jenuh (g)') + numOpt('na', 'Natrium (mg)') + numOpt('ch', 'Kolesterol (mg)') + '</div>' +
      num('pu', 'Purin (mg per 100 g)') + '<p class="foot">Tidak tahu nilai purinnya? Samakan dengan makanan sejenis di daftar. Rendah di bawah 50, sedang 50–150, tinggi di atas 150.</p>' +
      '<div class="grid2"><label class="field"><span>Nama 1 porsi</span><input type="text" name="pl" value="' + esc(v.pl) + '" maxlength="30" required></label>' +
      '<label class="field"><span>Berat 1 porsi (g)</span><input type="number" name="pg" inputmode="decimal" min="1" step="any" value="' + v.pg + '" required></label></div>' +
      '<label class="field"><span>Jenis khusus</span><select name="flag"><option value="">Tidak ada</option><option value="alk"' + (v.flag === 'alk' ? ' selected' : '') + '>Alkohol</option><option value="manis"' + (v.flag === 'manis' ? ' selected' : '') + '>Minuman manis</option></select></label>' +
      '<div class="btn-row"><button class="btn" type="submit">Simpan makanan</button>' + (f ? '<button class="btn danger-o" type="button" data-act="delete-food" data-id="' + esc(f.id) + '">Hapus</button>' : '') + '</div></form>');
  };
  NA.act['new-food'] = function () { NA.openFoodForm(null, ''); };
  NA.act['add-new-food'] = function () { NA.openFoodForm(null, 'add'); };
  NA.act['edit-food'] = function (el) { NA.openFoodForm(el.dataset.id, ''); };
  NA.submit.food = function (form) {
    if (!form.reportValidity()) return;
    const n = function (k) { return parseFloat(form.elements[k].value) || 0; };
    const id = form.dataset.id || 'c-' + U.uid();
    const rec = { id: id, name: form.elements.name.value.trim(), cat: form.elements.cat.value, kcal: n('kcal'), p: n('p'), c: n('c'), f: n('f'), fi: n('fi'), s: n('s'), pu: n('pu'), na: n('na'), ch: n('ch'), sf: n('sf'), pl: form.elements.pl.value.trim(), pg: n('pg'), flag: form.elements.flag.value };
    NA.db.put('foods', rec);
    const back = form.dataset.back;
    if (back === 'add' && S.add) {
      S.add.food = NA.foods.byId(id); S.add.step = 'portion'; S.add.qty = 1; S.add.unit = 'porsi'; showPortion();
    } else { NA.sheet.close(); NA.render(); }
    NA.toast('Makanan disimpan');
  };
  NA.act['delete-food'] = function (el) {
    const id = el.dataset.id; NA.db.del('foods', id); NA.sheet.close(); NA.render();
    NA.toast('Makanan dihapus', { label: 'Urungkan', fn: function () { NA.db.undel('foods', id); NA.render(); } });
  };
  NA.act['food-detail'] = function (el) {
    const f = NA.foods.byId(el.dataset.id); if (!f) return;
    const lv = NA.level(f.pu), k = f.pg / 100;
    const rows = [['Kalori', 'kcal', 'kkal'], ['Protein', 'p', 'g'], ['Karbo', 'c', 'g'], ['Lemak', 'f', 'g'], ['Serat', 'fi', 'g'], ['Gula', 's', 'g'], ['Purin', 'pu', 'mg'], ['Lemak jenuh', 'sf', 'g'], ['Natrium', 'na', 'mg'], ['Kolesterol', 'ch', 'mg']].map(function (r) {
      return '<tr><th>' + r[0] + '</th><td>' + fmt(f[r[1]] * k, NA.INT[r[1]] ? 0 : 1) + ' ' + r[2] + '</td><td>' + fmt(f[r[1]], NA.INT[r[1]] ? 0 : 1) + ' ' + r[2] + '</td></tr>';
    }).join('');
    const advice = { low: 'Purin rendah. Umumnya aman dimakan sesuai porsi.', mid: 'Purin sedang. Batasi porsi dan frekuensinya, terutama saat asam urat sedang tinggi.', high: 'Purin tinggi. Sebaiknya dihindari atau dibatasi ketat bila Anda mudah kambuh.' }[lv];
    NA.sheet.open('<div class="sheet-head"><h2>' + esc(f.name) + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Tutup">' + NA.icon('close') + '</button></div>' +
      '<div class="meta-row">' + NA.lvBadge(lv) + '<span class="muted">' + esc(NA.catName(f.cat)) + '</span>' + (f.flag === 'alk' ? '<span class="lv lv-high">Alkohol</span>' : '') + (f.flag === 'manis' ? '<span class="lv lv-mid">Manis</span>' : '') + '</div>' +
      '<p class="note">' + advice + (f.na >= 400 ? ' Natrium tinggi, perhatikan bila tensi Anda tinggi.' : '') + ((f.ch >= 150 || f.sf >= 5) ? ' Kolesterol atau lemak jenuh tinggi, batasi bila kolesterol Anda tinggi.' : '') + (f.flag === 'alk' ? ' Alkohol juga menghambat pembuangan asam urat.' : '') + (f.flag === 'manis' ? ' Gula/fruktosa dapat menaikkan asam urat.' : '') + '</p>' +
      '<table class="nut"><thead><tr><th></th><td>1 porsi (' + esc(f.pl) + ', ' + f.pg + ' g)</td><td>Per 100 g</td></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="btn-row"><button class="btn" data-act="log-food" data-id="' + esc(f.id) + '">Catat makanan ini</button>' + (f.custom ? '<button class="btn ghost" data-act="edit-food" data-id="' + esc(f.id) + '">Ubah</button>' : '') + '</div>');
  };
  NA.act['log-food'] = function (el) {
    const f = NA.foods.byId(el.dataset.id); if (!f) return;
    S.date = U.today(); const time = U.hm(new Date());
    S.add = { step: 'portion', q: '', cat: 'all', food: f, qty: 1, unit: 'porsi', date: S.date, time: time, meal: NA.mealByTime(time), editId: null };
    showPortion();
  };

  /* ====================== AKSI UMUM ====================== */
  NA.act.tab = function (el) { NA.go(el.dataset.tab); };
  NA.act['close-sheet'] = function () { NA.sheet.close(); };
  NA.act['toast-action'] = function () { const fn = NA.toast.action; document.getElementById('toast').hidden = true; if (fn) fn(); };
  NA.act['date-prev'] = function () { S.date = U.addDays(S.date, -1); NA.render(); };
  NA.act['date-next'] = function () { if (S.date < U.today()) { S.date = U.addDays(S.date, 1); NA.render(); } };
  NA.act['date-today'] = function () { S.date = U.today(); NA.render(); };
  NA.bind.date = function (el) { if (el.value) { S.date = el.value > U.today() ? U.today() : el.value; NA.render(); } };
  NA.act['open-day'] = function (el) { NA.sheet.close(); S.date = el.dataset.date; NA.go('today'); };
  NA.act['h-metric'] = function (el) { S.hMetric = el.dataset.v; NA.render(); };
  NA.act['h-range'] = function (el) { S.hRange = +el.dataset.v; NA.render(); };
  NA.bind.hq = function (el) { S.hq = el.value; document.getElementById('hist-results').innerHTML = histSearchHtml(); };
  NA.bind.fq = function (el) { S.fq = el.value; document.getElementById('food-results').innerHTML = foodsResultsHtml(); };
  NA.act['food-lv'] = function (el) { S.fLv = el.dataset.v; NA.render(); };
  NA.bind['food-cat'] = function (el) { S.fCat = el.value; document.getElementById('food-results').innerHTML = foodsResultsHtml(); };
  NA.bind.gev = function (el) { S.gEv = el.value; NA.render(); };
  NA.bind['add-cat'] = function (el) { S.add.cat = el.value; document.getElementById('add-results').innerHTML = addResultsHtml(); };

  /* ---- setelan ---- */
  NA.submit.targets = function (form) {
    if (!form.reportValidity()) return;
    const t = {}; ['kcal', 'p', 'c', 'f', 'fi', 's', 'pu', 'na', 'sf', 'ch', 'water'].forEach(function (k) { t[k] = parseFloat(form.elements[k].value) || 0; });
    NA.setTargets(t); NA.toast('Target disimpan');
  };
  function updateSyncStatus() {
    const el = document.getElementById('sync-status'); if (!el) return;
    el.className = 'status s-' + NA.syncState.state; el.textContent = syncText();
  }
  NA.on('sync', updateSyncStatus);
  NA.submit.conn = async function (form) {
    let url = form.elements.url.value.trim();
    NA.setConn({ url: url, token: form.elements.token.value.trim(), auto: form.elements.auto.checked });
    if (!url && !form.elements.token.value.trim()) { NA.toast('Koneksi dikosongkan'); return; }
    if (url.indexOf('https://script.google.com/') !== 0 && url.indexOf('https://script.googleusercontent.com/') !== 0) { NA.toast('URL harus dimulai dengan https://script.google.com/'); return; }
    try {
      NA.toast('Menguji koneksi…'); await NA.sync.test();
      NA.toast('Terhubung. Memulai sinkron…'); await NA.sync.run({ throwOnError: true }); NA.toast('Sinkron selesai');
    } catch (e) { NA.toast(e.message || 'Gagal terhubung'); }
  };
  NA.act['sync-now'] = async function () {
    if (!NA.sync.configured()) { NA.toast('Isi URL dan token lalu simpan dulu.'); return; }
    const ok = await NA.sync.run(); NA.toast(ok ? 'Sinkron selesai' : (NA.syncState.msg || 'Sinkron gagal'));
  };
  NA.act['full-resync'] = async function () {
    if (!NA.sync.configured()) { NA.toast('Hubungkan Google Sheets dulu.'); return; }
    NA.fullResync(); const ok = await NA.sync.run(); NA.toast(ok ? 'Semua data terkirim ulang' : (NA.syncState.msg || 'Gagal'));
  };
  const download = function (name, mime, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  NA.act['export-csv'] = function () { download('asupan-' + U.today() + '.csv', 'text/csv;charset=utf-8', NA.exportCSV()); };
  NA.act['export-json'] = function () { download('cadangan-asupan-' + U.today() + '.json', 'application/json', NA.exportJSON()); };
  NA.bind['import'] = function (el) {
    const f = el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function () { try { const n = NA.importJSON(String(r.result)); NA.render(); NA.toast(n + ' catatan dipulihkan'); } catch (e) { NA.toast(e.message || 'File tidak valid'); } };
    r.readAsText(f); el.value = '';
  };
  NA.act.wipe = function () {
    if (!confirm('Hapus semua catatan di perangkat ini? Data di Google Sheet tidak ikut terhapus dan akan terunduh lagi saat sinkron.')) return;
    NA.wipe(); NA.render(); NA.toast('Data perangkat dihapus');
  };
  NA.act['install-app'] = async function () {
    const e = NA.installEvt; if (!e) return;
    e.prompt(); await e.userChoice; NA.installEvt = null; NA.render();
  };
})();
