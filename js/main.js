/* Inisialisasi, event delegation, PWA. */
(function () {
  'use strict';
  const NA = window.NA;

  /* klik */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-tab],[data-act]');
    if (!t) return;
    if (t.dataset.tab && !t.dataset.act) { NA.go(t.dataset.tab); return; }
    const fn = NA.act[t.dataset.act];
    if (fn) fn(t, e);
  });

  /* submit form */
  document.addEventListener('submit', function (e) {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = NA.submit[f.dataset.form];
    if (fn) fn(f);
  });

  /* input langsung (pratinjau, pencarian) */
  document.addEventListener('input', function (e) {
    const t = e.target;
    if (t.dataset && t.dataset.bind && t.type !== 'file' && t.type !== 'date') { const b = NA.bind[t.dataset.bind]; if (b) b(t); return; }
    const f = t.closest && t.closest('form[data-live]');
    if (f && NA.live[f.dataset.live]) NA.live[f.dataset.live](f, e);
  });
  document.addEventListener('change', function (e) {
    const t = e.target;
    if (t.dataset && t.dataset.bind && (t.type === 'file' || t.type === 'date')) { const b = NA.bind[t.dataset.bind]; if (b) b(t); return; }
    const f = t.closest && t.closest('form[data-live]');
    if (f && NA.live[f.dataset.live]) NA.live[f.dataset.live](f, e);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && NA.sheet.isOpen()) NA.sheet.close();
  });

  /* indikator sinkron di header */
  const chip = document.getElementById('sync-chip');
  const LABEL = { off: 'Lokal', syncing: 'Sinkron…', ok: 'Tersinkron', pending: 'Menunggu', offline: 'Offline', error: 'Gagal sinkron' };
  function paintChip() {
    const s = NA.syncState;
    chip.dataset.state = s.state;
    chip.querySelector('span').textContent = LABEL[s.state] || '';
    chip.title = s.msg || LABEL[s.state] || '';
  }
  NA.on('sync', paintChip);
  chip.addEventListener('click', function () {
    if (!NA.sync.configured()) { NA.go('settings'); return; }
    if (NA.syncState.state === 'error') { NA.go('settings'); return; }
    NA.sync.run().then(function (ok) { NA.toast(ok ? 'Sinkron selesai' : (NA.syncState.msg || 'Sinkron gagal')); });
  });

  NA.on('remote-change', function () {
    if (NA.sheet.isOpen() || NA.S.tab === 'settings') return;
    NA.render();
  });
  NA.on('error', function (m) { NA.toast(m); });

  /* PWA: pasang aplikasi */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); NA.installEvt = e;
    if (NA.S.tab === 'settings') NA.render();
  });
  window.addEventListener('appinstalled', function () { NA.installEvt = null; if (NA.S.tab === 'settings') NA.render(); });

  /* service worker */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
  if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function () {}); }

  /* tanggal berganti saat aplikasi dibuka lagi setelah lewat tengah malam */
  let lastDay = NA.u.today();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    const t = NA.u.today();
    if (t !== lastDay) { if (NA.S.date === lastDay) NA.S.date = t; lastDay = t; if (!NA.sheet.isOpen()) NA.render(); }
    if (NA.sync.configured() && NA.db.get().conn.auto) NA.sync.run();
  });

  /* mulai */
  NA.render();
  paintChip();
  const params = new URLSearchParams(location.search);
  if (params.get('add')) NA.openAdd('');
  else if (params.get('gout')) NA.openHealth('nyeri');
  if (NA.sync.configured()) { NA.syncState = { state: 'pending', msg: '', at: 0 }; paintChip(); if (NA.db.get().conn.auto) NA.sync.run(); }
})();
