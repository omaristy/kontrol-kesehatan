/* Komponen UI bersama: ikon, sheet, toast, gauge, grafik. */
(function () {
  'use strict';
  const NA = window.NA;
  const esc = NA.u.esc, fmt = NA.u.fmt;

  const P = {
    today: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-1.6 1-2 1-3.6M12 8c0-1.6 1-2 1-3.6M16 8c0-1.6 1-2 1-3.6"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    gout: '<path d="M12 3c3.2 4.2 6 7.2 6 10.6a6 6 0 0 1-12 0C6 10.2 8.8 7.2 12 3z"/><path d="M12 12v3M12 17.5v.01"/>',
    foods: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8.5a4.75 4.75 0 0 1 .5 9.5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.01"/>',
  };
  NA.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  };

  NA.lvBadge = function (lv) { return '<span class="lv lv-' + lv + '">' + NA.LV[lv] + '</span>'; };

  /* ---------- sheet ---------- */
  const sheetEl = function () { return document.getElementById('sheet'); };
  NA.sheet = {
    open: function (html) {
      const s = sheetEl();
      s.querySelector('.sheet-body').innerHTML = html;
      s.hidden = false;
      document.body.classList.add('noscroll');
      s.querySelector('.sheet').scrollTop = 0;
    },
    set: function (html) { sheetEl().querySelector('.sheet-body').innerHTML = html; },
    close: function () {
      const s = sheetEl(); s.hidden = true;
      s.querySelector('.sheet-body').innerHTML = '';
      document.body.classList.remove('noscroll');
    },
    isOpen: function () { return !sheetEl().hidden; },
  };

  /* ---------- toast ---------- */
  let toastTimer;
  NA.toast = function (msg, action) {
    const t = document.getElementById('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" data-act="toast-action">' + esc(action.label) + '</button>' : '');
    t.hidden = false;
    NA.toast.action = action ? action.fn : null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; NA.toast.action = null; }, action ? 6000 : 2800);
  };

  /* ---------- gauge purin (setengah lingkaran) ---------- */
  NA.gauge = function (value, limit, status) {
    const pct = limit > 0 ? Math.min(value / limit, 1) * 100 : 0;
    const over = limit > 0 && value > limit;
    const tickPct = 60;
    // titik tanda 60% (batas "aman") pada busur
    const ang = Math.PI * (1 - tickPct / 100);
    const cx = 110, cy = 104, r = 84;
    const tx1 = cx + (r - 11) * Math.cos(ang), ty1 = cy - (r - 11) * Math.sin(ang);
    const tx2 = cx + (r + 11) * Math.cos(ang), ty2 = cy - (r + 11) * Math.sin(ang);
    const d = 'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
    return '<svg class="gauge g-' + status + '" viewBox="0 0 220 124" role="img" aria-label="Purin ' + fmt(value, 0) + ' dari batas ' + fmt(limit, 0) + ' miligram">' +
      '<path class="g-track" d="' + d + '" pathLength="100"/>' +
      '<path class="g-fill" d="' + d + '" pathLength="100" stroke-dasharray="' + pct.toFixed(2) + ' 100"/>' +
      '<line class="g-tick" x1="' + tx1.toFixed(1) + '" y1="' + ty1.toFixed(1) + '" x2="' + tx2.toFixed(1) + '" y2="' + ty2.toFixed(1) + '"/>' +
      '<text class="g-num" x="110" y="90" text-anchor="middle">' + fmt(value, 0) + '</text>' +
      '<text class="g-unit" x="110" y="112" text-anchor="middle">mg dari ' + fmt(limit, 0) + (over ? ' · lewat ' + fmt(value - limit, 0) : '') + '</text>' +
      '</svg>';
  };

  /* ---------- grafik batang ---------- */
  // o: {data:[{label, v, date, mark}], limit, unit, w, h, fmtV}
  NA.barChart = function (o) {
    const W = o.w || 340, H = o.h || 160, L = 30, R = 4, T = 14, B = 24;
    const n = o.data.length;
    const maxV = Math.max.apply(null, o.data.map(function (d) { return d.v; }).concat([o.limit || 0, 1])) * 1.12;
    const bw = (W - L - R) / n;
    const gap = Math.min(5, bw * 0.28);
    const y = function (v) { return T + (H - T - B) * (1 - v / maxV); };
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik') + '">';
    s += '<line class="ax" x1="' + L + '" y1="' + y(0) + '" x2="' + (W - R) + '" y2="' + y(0) + '"/>';
    s += '<text class="tk" x="' + (L - 4) + '" y="' + (y(0) + 3) + '" text-anchor="end">0</text>';
    if (o.limit) {
      s += '<line class="lim" x1="' + L + '" y1="' + y(o.limit).toFixed(1) + '" x2="' + (W - R) + '" y2="' + y(o.limit).toFixed(1) + '"/>';
      s += '<text class="tk" x="' + (L - 4) + '" y="' + (y(o.limit) + 3).toFixed(1) + '" text-anchor="end">' + fmt(o.limit, 0) + '</text>';
    }
    const every = n > 20 ? 5 : n > 10 ? 2 : 1;
    o.data.forEach(function (d, i) {
      const x = L + i * bw + gap / 2, w = bw - gap;
      const h = Math.max(d.v > 0 ? 2 : 0, y(0) - y(d.v));
      const over = o.limit && d.v > o.limit;
      s += '<g' + (d.date ? ' class="hit" data-act="open-day" data-date="' + d.date + '"' : '') + '>';
      s += '<rect class="hitbox" x="' + (L + i * bw).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + (H - T - B) + '"/>';
      if (d.v > 0) s += '<rect class="bar' + (over ? ' over' : '') + (d.dim ? ' dim' : '') + '" x="' + x.toFixed(1) + '" y="' + (y(0) - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2.5"><title>' + esc(d.label + ': ' + fmt(d.v, 0) + ' ' + (o.unit || '')) + '</title></rect>';
      if (d.mark) {
        const mx = L + i * bw + bw / 2, my = Math.max(T - 2, y(d.v) - 9);
        s += '<path class="mark" d="M' + (mx - 4.5).toFixed(1) + ' ' + (my - 2).toFixed(1) + 'h9l-4.5 8z"/>';
      }
      if (i % every === 0 || i === n - 1) s += '<text class="tk" x="' + (L + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(d.tick) + '</text>';
      s += '</g>';
    });
    return s + '</svg>';
  };

  NA.seg = function (act, cur, opts) {
    return '<div class="seg" role="group">' + opts.map(function (o) {
      return '<button type="button" class="' + (String(o[0]) === String(cur) ? 'on' : '') + '" data-act="' + act + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(o[0]) === String(cur)) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  };
})();
