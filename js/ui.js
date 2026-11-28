/* SAKU — UI helpers: icons, toast, bottom sheets (with Android back-button support) */
(function (g) {
  'use strict';
  const Saku = (g.Saku = g.Saku || {});
  const $ = (s, r) => (r || document).querySelector(s);

  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a.5.5 0 0 0 .5.5h4v-5.5h4V20h4a.5.5 0 0 0 .5-.5V10"/>',
    list: '<path d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7L13 20l-3-1.7L7 20l-2-1V6a1 1 0 0 1 1-1z" transform="translate(0 -.5)"/><path d="M9 9h6M9 13h6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    piggy: '<path d="M19 11.5c0-3-2.7-5-6-5H9.5C6.5 6.5 4.5 8.6 4.5 11c0 1.6.8 3 2 3.9V18h3v-1.5h4V18h3v-3.2c1-.7 1.7-1.7 2-2.8H21v-3h-1.7"/><circle cx="15.5" cy="10.5" r=".6" fill="currentColor"/><path d="M8.5 6.5 9.5 4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1.1" fill="currentColor"/>',
    food: '<path d="M5 3v7a2 2 0 0 0 2 2v9M9 3v7a2 2 0 0 1-2 2M7 3v5M17 21V3c-2 1.5-3 4-3 7 0 1.5 1 2.5 3 2.5"/>',
    bus: '<rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16M7 20v-3M17 20v-3"/><circle cx="8" cy="14" r=".8" fill="currentColor"/><circle cx="16" cy="14" r=".8" fill="currentColor"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18v3H3zM12 9v11M12 9c-3 0-4.5-1-4.5-2.5S9 4 10.5 5 12 9 12 9zm0 0c3 0 4.5-1 4.5-2.5S15 4 13.5 5 12 9 12 9z"/>',
    dots: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4M6.6 7.3A16.4 16.4 0 0 0 2 12s3.5 6.5 10 6.5c1.4 0 2.7-.3 3.8-.8"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4.2 3.7"/>',
    arrows: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  };
  const icon = (name, size) =>
    `<svg class="ic" width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.dots}</svg>`;

  const CAT_ICON = {
    Makanan: 'food', Transportasi: 'bus', Sekolah: 'book', Hiburan: 'music', Belanja: 'bag',
    'Pulsa & Data': 'phone', Tabungan: 'piggy', 'Uang saku': 'wallet', 'Gaji / Part-time': 'briefcase', Hadiah: 'gift',
  };
  const catIcon = (cat, type) => CAT_ICON[cat] || (type === 'income' ? 'down' : 'up');

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg, kind) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (kind === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- bottom sheets (<dialog>) ----------
   * Each open sheet pushes a history entry so the Android back button closes the
   * top sheet instead of exiting the app. */
  const stack = [];
  let ignorePops = 0;

  function openSheet(id) {
    const d = $('#' + id);
    if (!d || d.open) return;
    d.showModal();
    stack.push(id);
    try { history.pushState({ sheet: id }, ''); } catch (e) { /* ignore */ }
  }
  function closeSheet(id) {
    const d = $('#' + id);
    if (d && d.open) d.close();
  }
  function bindSheet(d) {
    d.addEventListener('close', () => {
      const i = stack.lastIndexOf(d.id);
      if (i > -1) {
        stack.splice(i, 1);
        ignorePops++;
        try { history.back(); } catch (e) { ignorePops--; }
      }
    });
    d.addEventListener('click', (e) => { // tap on the dimmed backdrop closes
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) d.close();
    });
  }
  function init() {
    document.querySelectorAll('dialog.sheet').forEach(bindSheet);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-close]');
      if (b) closeSheet(b.dataset.close);
    });
    window.addEventListener('popstate', () => {
      if (ignorePops > 0) { ignorePops--; return; }
      const id = stack.pop();
      if (id) { const d = $('#' + id); if (d && d.open) d.close(); }
    });
  }

  /* ---------- confirm dialog ---------- */
  let confirmCb = null;
  function confirmDialog({ title, text, okLabel, onOk }) {
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    $('#confirmOk').textContent = okLabel || 'Ya, hapus';
    confirmCb = onOk;
    openSheet('confirmSheet');
  }
  function bindConfirm() {
    $('#confirmOk').addEventListener('click', () => {
      const cb = confirmCb;
      confirmCb = null;
      closeSheet('confirmSheet');
      if (cb) cb();
    });
  }

  Saku.ui = { icon, catIcon, toast, openSheet, closeSheet, init, confirmDialog, bindConfirm };
})(window);
