/* SAKU — application: rendering + event handling */
(function () {
  'use strict';
  const { utils: U, store: S, ui: UI } = window.Saku;
  const E = U.escapeHTML;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- preferences (separate key; never touches finance data) ---------- */
  const PREF_KEY = 'saku-prefs';
  let prefs = { name: '', hideBalance: false };
  try { prefs = { ...prefs, ...(JSON.parse(localStorage.getItem(PREF_KEY)) || {}) }; } catch (e) { /* ignore */ }
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  const view = { current: 'home', type: 'all', q: '', month: 'all', reportMonth: U.currentMonth() };
  let editingTxId = null;
  let editingGoalId = null;
  const CAT_COLORS = ['#2f6bff', '#10a461', '#f5a524', '#e5484d', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  /* ---------- rendering helpers ---------- */
  function txRow(tx, withActions) {
    const sign = tx.type === 'income' ? '+' : '−';
    const note = tx.note ? `<small class="tx-note">${E(tx.note)}</small>` : '';
    const actions = withActions
      ? `<div class="tx-actions"><button class="act" data-action="edit-tx" data-id="${tx.id}" aria-label="Edit ${E(tx.title)}">${UI.icon('edit', 16)}</button><button class="act del" data-action="delete-tx" data-id="${tx.id}" aria-label="Hapus ${E(tx.title)}">${UI.icon('trash', 16)}</button></div>`
      : '';
    const tag = withActions ? 'div' : 'button';
    const attrs = withActions ? '' : ` data-action="edit-tx" data-id="${tx.id}" aria-label="Edit ${E(tx.title)}"`;
    return `<${tag} class="tx ${tx.type}"${attrs}>
      <span class="tx-ic ${tx.type}">${UI.icon(UI.catIcon(tx.category, tx.type), 20)}</span>
      <span class="tx-main"><b>${E(tx.title)}</b><small>${E(tx.category)} · ${U.formatDate(tx.date)}</small>${note}</span>
      <span class="tx-side"><span class="tx-amt ${tx.type}">${sign}${U.rupiah(tx.amount)}</span>${actions}</span>
    </${tag}>`;
  }
  const emptyState = (iconName, title, text, btn) =>
    `<div class="empty">${`<span class="empty-ic">${UI.icon(iconName, 30)}</span>`}<b>${title}</b><p>${text}</p>${btn || ''}</div>`;

  /* ---------- Home ---------- */
  function renderHome() {
    const t = S.totals();
    $('#greetText').textContent = U.greeting();
    $('#greetName').textContent = prefs.name || 'pelajar';
    $('#avatarBtn').textContent = (prefs.name || 'P').trim().charAt(0).toUpperCase();
    const bal = $('#balance');
    bal.textContent = prefs.hideBalance ? 'Rp ••••••' : U.rupiah(t.balance);
    bal.classList.toggle('neg', !prefs.hideBalance && t.balance < 0);
    const eye = $('#eyeBtn');
    eye.innerHTML = UI.icon(prefs.hideBalance ? 'eyeoff' : 'eye', 20);
    eye.setAttribute('aria-label', prefs.hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo');

    const key = U.currentMonth();
    const m = S.monthSummary(key);
    $('#homeMonthName').textContent = U.monthLabel(key);
    const ratio = m.income > 0 ? Math.round((m.expense / m.income) * 100) : m.expense > 0 ? 100 : 0;
    const over = m.expense > m.income;
    $('#homeMonth').innerHTML = `
      <div class="sum-grid">
        <div class="sum-tile income"><span class="sum-ic">${UI.icon('down', 18)}</span><small>Pemasukan</small><b>${U.rupiah(m.income)}</b></div>
        <div class="sum-tile expense"><span class="sum-ic">${UI.icon('up', 18)}</span><small>Pengeluaran</small><b>${U.rupiah(m.expense)}</b></div>
      </div>
      <div class="ratio"><div class="ratio-top"><span>${m.income || m.expense ? (over ? 'Pengeluaran melebihi pemasukan' : 'Terpakai dari pemasukan') : 'Belum ada transaksi bulan ini'}</span><b class="${over ? 'neg' : ''}">${ratio}%</b></div>
      <div class="bar"><span class="${over ? 'over' : ''}" style="width:${Math.min(100, ratio)}%"></span></div>
      <div class="ratio-foot"><span>Selisih bulan ini</span><b class="${m.net < 0 ? 'neg' : 'pos'}">${m.net >= 0 ? '+' : ''}${U.rupiah(m.net)}</b></div></div>`;

    const recent = S.sortedTransactions().slice(0, 5);
    $('#recentList').innerHTML = recent.length
      ? recent.map((x) => txRow(x, false)).join('')
      : emptyState('list', 'Belum ada transaksi', 'Catat pemasukan atau pengeluaran pertamamu.', `<button class="btn small primary" data-action="add-tx" data-type="expense">Tambah transaksi</button>`);

    const goals = S.getGoals();
    $('#homeGoals').innerHTML = goals.length
      ? `<div class="goal-scroll">${goals.slice(0, 6).map(goalMini).join('')}</div>`
      : `<div class="card">${emptyState('target', 'Belum ada target', 'Buat target kecil supaya menabung lebih terarah.', `<button class="btn small primary" data-action="add-goal">Buat target</button>`)}</div>`;
  }
  function goalMini(g) {
    const pct = U.percent(g.saved, g.target);
    return `<button class="goal-mini" data-action="goto" data-view="goals"><span class="goal-mini-top"><span class="goal-ic">${UI.icon('piggy', 18)}</span><b>${pct}%</b></span>
      <strong>${E(g.name)}</strong><small>${U.rupiah(g.saved)} / ${U.rupiah(g.target)}</small><span class="bar"><span style="width:${pct}%"></span></span></button>`;
  }

  /* ---------- Transactions ---------- */
  function filteredTransactions() {
    const q = view.q.trim().toLowerCase();
    return S.sortedTransactions().filter((t) =>
      (view.type === 'all' || t.type === view.type) &&
      (view.month === 'all' || t.date.startsWith(view.month)) &&
      (!q || `${t.title} ${t.category} ${t.note || ''}`.toLowerCase().includes(q)));
  }
  function renderTransactions() {
    const months = [...new Set(S.getTransactions().map((t) => t.date.slice(0, 7)))].sort().reverse();
    if (view.month !== 'all' && !months.includes(view.month)) view.month = 'all';
    $('#txMonth').innerHTML = `<option value="all">Semua bulan</option>` + months.map((k) => `<option value="${k}" ${k === view.month ? 'selected' : ''}>${U.monthLabel(k)}</option>`).join('');
    $$('[data-action="filter-type"]').forEach((c) => c.classList.toggle('active', c.dataset.value === view.type));

    const list = filteredTransactions();
    const inc = list.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
    const exp = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    $('#txSummary').innerHTML = list.length
      ? `<span>${list.length} transaksi</span><span class="pos">+${U.rupiah(inc)}</span><span class="neg">−${U.rupiah(exp)}</span>`
      : '';

    if (!list.length) {
      const filtered = view.q || view.type !== 'all' || view.month !== 'all';
      $('#allList').innerHTML = `<div class="card">${filtered
        ? emptyState('search', 'Tidak ada hasil', 'Coba ubah kata kunci atau filter.')
        : emptyState('list', 'Belum ada transaksi', 'Mulai catat uang masuk dan keluarmu.', `<button class="btn small primary" data-action="add-tx" data-type="expense">Tambah transaksi</button>`)}</div>`;
      return;
    }
    const groups = new Map();
    list.forEach((t) => { if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t); });
    $('#allList').innerHTML = [...groups.entries()].map(([date, items]) =>
      `<div class="day-group"><div class="day-label">${U.dayLabel(date)}</div><div class="card list-card">${items.map((x) => txRow(x, true)).join('')}</div></div>`).join('');
  }

  /* ---------- Goals ---------- */
  function renderGoals() {
    const goals = S.getGoals();
    $('#addGoalBtn').innerHTML = `${UI.icon('plus', 16)} Target`;
    if (!goals.length) {
      $('#goalsSummary').innerHTML = '';
      $('#goalList').innerHTML = `<div class="card">${emptyState('target', 'Belum ada target tabungan', 'Mulai dari sesuatu yang ingin kamu capai, misalnya beli buku atau sepatu.', `<button class="btn small primary" data-action="add-goal">Buat target pertama</button>`)}</div>`;
      return;
    }
    const saved = goals.reduce((a, g) => a + g.saved, 0);
    const target = goals.reduce((a, g) => a + g.target, 0);
    const pct = U.percent(saved, target);
    $('#goalsSummary').innerHTML = `<div class="card goal-total"><div><small>Total terkumpul</small><b>${U.rupiah(saved)}</b><small>dari ${U.rupiah(target)} · ${goals.length} target</small></div><div class="ring" style="--p:${pct}"><span>${pct}%</span></div></div>`;
    $('#goalList').innerHTML = goals.map((g) => {
      const p = U.percent(g.saved, g.target);
      const done = g.saved >= g.target;
      return `<article class="card goal-card ${done ? 'done' : ''}">
        <div class="goal-head"><span class="goal-ic big">${UI.icon(done ? 'check' : 'piggy', 22)}</span><div class="goal-title"><b>${E(g.name)}</b><small>${done ? 'Target tercapai 🎉' : `${U.rupiah(Math.max(0, g.target - g.saved))} lagi`}</small></div><strong class="goal-pct">${p}%</strong></div>
        <div class="bar thick"><span style="width:${p}%"></span></div>
        <div class="goal-nums"><span>${U.rupiah(g.saved)}</span><span>${U.rupiah(g.target)}</span></div>
        <div class="goal-actions"><button class="btn small primary grow" data-action="save-goal" data-id="${g.id}">${UI.icon('plus', 16)} Tabung</button><button class="btn small ghost" data-action="edit-goal" data-id="${g.id}">${UI.icon('edit', 16)} Edit</button><button class="btn small danger-outline" data-action="delete-goal" data-id="${g.id}" aria-label="Hapus ${E(g.name)}">${UI.icon('trash', 16)}</button></div>
      </article>`;
    }).join('');
  }

  /* ---------- Report ---------- */
  function barChart(series) {
    const W = 340, H = 210, padT = 20, padB = 26, padX = 6;
    const max = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
    const slot = (W - padX * 2) / series.length;
    const bw = Math.min(17, slot / 2 - 3);
    const ch = H - padT - padB;
    const grid = [0, 0.5, 1].map((f) => `<line x1="${padX}" x2="${W - padX}" y1="${H - padB - ch * f}" y2="${H - padB - ch * f}" class="grid"/>`).join('');
    const bars = series.map((s, i) => {
      const cx = padX + slot * i + slot / 2;
      const one = (v, x, cls) => {
        const h = v > 0 ? Math.max(2, (v / max) * ch) : 0;
        const y = H - padB - h;
        return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" class="${cls}"/>${v > 0 ? `<text x="${x + bw / 2}" y="${y - 3}" class="val" text-anchor="middle">${U.compact(v)}</text>` : ''}`;
      };
      const label = U.monthLabel(s.key, true).split(' ')[0];
      return `${one(s.income, cx - bw - 1.5, 'bar-inc')}${one(s.expense, cx + 1.5, 'bar-exp')}<text x="${cx}" y="${H - 8}" text-anchor="middle" class="xl ${s.key === view.reportMonth ? 'cur' : ''}">${label}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Grafik pemasukan dan pengeluaran 6 bulan terakhir">${grid}${bars}</svg>`;
  }
  function renderReport() {
    const all = S.totals();
    $('#reportTotals').innerHTML = `
      <div class="tot-main"><small>Saldo saat ini</small><b class="${all.balance < 0 ? 'neg' : ''}">${U.rupiah(all.balance)}</b></div>
      <div class="tot-row"><div><span class="dot inc"></span><small>Total pemasukan</small><b>${U.rupiah(all.income)}</b></div><div><span class="dot exp"></span><small>Total pengeluaran</small><b>${U.rupiah(all.expense)}</b></div></div>`;

    $('#prevMonth').innerHTML = UI.icon('left', 18);
    $('#nextMonth').innerHTML = UI.icon('right', 18);
    $('#nextMonth').disabled = view.reportMonth >= U.currentMonth();
    $('#reportMonthLabel').textContent = U.monthLabel(view.reportMonth);

    const m = S.monthSummary(view.reportMonth);
    $('#reportMonth').innerHTML = `<div class="rep-grid"><div><small>Pemasukan</small><b class="pos">${U.rupiah(m.income)}</b></div><div><small>Pengeluaran</small><b class="neg">${U.rupiah(m.expense)}</b></div><div><small>Selisih</small><b class="${m.net < 0 ? 'neg' : 'pos'}">${m.net >= 0 ? '+' : ''}${U.rupiah(m.net)}</b></div></div><p class="muted-note center">${m.count} transaksi pada ${U.monthLabel(view.reportMonth)}</p>`;

    const series = S.monthlySeries(view.reportMonth, 6);
    const hasAny = series.some((s) => s.income || s.expense);
    $('#reportChart').innerHTML = hasAny
      ? `<div class="legend"><span><i class="dot inc"></i>Pemasukan</span><span><i class="dot exp"></i>Pengeluaran</span></div>${barChart(series)}`
      : emptyState('chart', 'Belum ada data', 'Grafik muncul setelah kamu mencatat transaksi.');

    const cats = S.expenseByCategory(view.reportMonth);
    if (!cats.items.length) {
      $('#reportCats').innerHTML = emptyState('chart', 'Belum ada pengeluaran', `Tidak ada pengeluaran pada ${U.monthLabel(view.reportMonth)}.`);
      return;
    }
    let acc = 0;
    const stops = cats.items.map((c, i) => { const s = acc; acc += c.pct; return `${CAT_COLORS[i % CAT_COLORS.length]} ${s}% ${acc}%`; }).join(',');
    $('#reportCats').innerHTML = `
      <div class="donut-wrap"><div class="donut" style="background:conic-gradient(${stops})"><div><small>Total</small><b>${U.compact(cats.total)}</b></div></div></div>
      <div class="cat-list">${cats.items.map((c, i) => `
        <div class="cat-row"><div class="cat-top"><span><i class="dot" style="background:${CAT_COLORS[i % CAT_COLORS.length]}"></i>${E(c.name)}</span><span><b>${U.rupiah(c.amount)}</b> <small>${c.pct.toFixed(c.pct < 10 && c.pct % 1 ? 1 : 0)}%</small></span></div>
        <div class="bar"><span style="width:${c.pct}%;background:${CAT_COLORS[i % CAT_COLORS.length]}"></span></div></div>`).join('')}</div>`;
  }

  function render() {
    renderHome(); renderTransactions(); renderGoals(); renderReport();
  }

  /* ---------- navigation ---------- */
  function showView(id) {
    view.current = id;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + id));
    $$('.nav-btn').forEach((b) => { const on = b.dataset.view === id; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    window.scrollTo(0, 0);
  }

  /* ---------- form helpers ---------- */
  function clearErrors(form) {
    $$('[data-err]', form).forEach((e) => { e.textContent = ''; });
    $$('.invalid', form).forEach((e) => e.classList.remove('invalid'));
  }
  function showErrors(form, errors, map) {
    clearErrors(form);
    let first = null;
    Object.entries(errors).forEach(([k, msg]) => {
      const el = $(`[data-err="${k}"]`, form);
      if (el) el.textContent = msg;
      const input = map && map[k] ? $(map[k], form) : null;
      if (input) { input.classList.add('invalid'); if (!first) first = input; }
    });
    if (first) first.focus();
  }
  function bindPreview(inputId, previewId, fallback) {
    const input = $('#' + inputId), out = $('#' + previewId);
    const update = () => {
      const raw = input.value.trim();
      if (!raw) { out.textContent = fallback || ''; out.className = 'preview'; return; }
      const n = U.parseMoney(raw);
      if (Number.isFinite(n)) { out.textContent = `= ${U.rupiah(n)}`; out.className = 'preview ok'; }
      else { out.textContent = 'Nominal tidak valid'; out.className = 'preview bad'; }
    };
    input.addEventListener('input', update);
    input._update = update;
    update();
  }

  /* ---------- transaction sheet ---------- */
  function setTxType(type) {
    $$('input[name="type"]', $('#txForm')).forEach((r) => { r.checked = r.value === type; });
    const base = type === 'income' ? U.INCOME_CATS : U.EXPENSE_CATS;
    const cur = $('#txCategory').value;
    const orig = editingTxId !== null ? S.getTransaction(editingTxId) : null;
    // keep the current category if it fits the new type; otherwise fall back to the original (legacy) one when editing
    const sel = base.includes(cur) ? cur : orig && orig.type === type ? orig.category : null;
    fillCategories(type, sel);
    if (editingTxId === null) $('#txSheetTitle').textContent = type === 'income' ? 'Tambah pemasukan' : 'Tambah pengeluaran';
  }
  function fillCategories(type, selected) {
    const base = type === 'income' ? U.INCOME_CATS : U.EXPENSE_CATS;
    const cats = selected && !base.includes(selected) ? [...base, selected] : base; // keep legacy categories editable
    $('#txCategory').innerHTML = cats.map((c) => `<option value="${E(c)}">${E(c)}</option>`).join('');
    $('#txCategory').value = selected && cats.includes(selected) ? selected : cats[0];
  }
  function openTxSheet({ id, type }) {
    const form = $('#txForm');
    clearErrors(form);
    const tx = id != null ? S.getTransaction(id) : null;
    if (id != null && !tx) return;
    editingTxId = tx ? tx.id : null;
    $('#txAmount').value = tx ? U.rupiah(tx.amount) : '';
    $('#txTitle').value = tx ? tx.title : '';
    $('#txDate').value = tx ? tx.date : U.today();
    $('#txNote').value = tx ? tx.note || '' : '';
    const startType = tx ? tx.type : type || 'expense';
    fillCategories(startType, tx ? tx.category : null);
    setTxType(startType);
    if (tx) $('#txSheetTitle').textContent = 'Edit transaksi';
    $('#txSubmit').textContent = tx ? 'Simpan perubahan' : 'Simpan';
    $('#txDelete').hidden = !tx;
    $('#txAmount')._update();
    UI.openSheet('txSheet');
    if (!tx) setTimeout(() => $('#txAmount').focus(), 120);
  }
  function submitTx(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = {
      type: ($('input[name="type"]:checked', form) || {}).value,
      title: $('#txTitle').value, amount: $('#txAmount').value, category: $('#txCategory').value,
      date: $('#txDate').value, note: $('#txNote').value,
    };
    const res = editingTxId !== null ? S.updateTransaction(editingTxId, input) : S.addTransaction(input);
    if (!res.ok) {
      showErrors(form, res.errors, { amount: '#txAmount', title: '#txTitle', category: '#txCategory', date: '#txDate', note: '#txNote' });
      return;
    }
    const wasEdit = editingTxId !== null;
    UI.closeSheet('txSheet');
    editingTxId = null;
    render();
    UI.toast(wasEdit ? 'Transaksi diperbarui' : 'Transaksi dicatat');
  }
  function askDeleteTx(id, alsoCloseSheet) {
    const tx = S.getTransaction(id);
    if (!tx) return;
    UI.confirmDialog({
      title: 'Hapus transaksi?',
      text: `"${tx.title}" (${tx.type === 'income' ? '+' : '−'}${U.rupiah(tx.amount)}) akan dihapus permanen dan saldo dihitung ulang.`,
      onOk: () => {
        const res = S.deleteTransaction(id);
        if (!res.ok) { UI.toast(res.errors._form, 'error'); return; }
        if (alsoCloseSheet) UI.closeSheet('txSheet');
        editingTxId = null;
        render();
        UI.toast('Transaksi dihapus');
      },
    });
  }

  /* ---------- goal sheets ---------- */
  function openGoalSheet(id) {
    const form = $('#goalForm');
    clearErrors(form);
    const g = id != null ? S.getGoal(id) : null;
    if (id != null && !g) return;
    editingGoalId = g ? g.id : null;
    $('#goalName').value = g ? g.name : '';
    $('#goalTarget').value = g ? U.rupiah(g.target) : '';
    $('#goalSaved').value = g ? U.rupiah(g.saved) : '0';
    $('#goalSheetTitle').textContent = g ? 'Edit target' : 'Target baru';
    $('#goalSubmit').textContent = g ? 'Simpan perubahan' : 'Simpan target';
    $('#goalTarget')._update(); $('#goalSaved')._update();
    UI.openSheet('goalSheet');
  }
  function submitGoal(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = { name: $('#goalName').value, target: $('#goalTarget').value, saved: $('#goalSaved').value };
    const res = editingGoalId !== null ? S.updateGoal(editingGoalId, input) : S.addGoal(input);
    if (!res.ok) { showErrors(form, res.errors, { name: '#goalName', target: '#goalTarget', saved: '#goalSaved' }); return; }
    const wasEdit = editingGoalId !== null;
    UI.closeSheet('goalSheet');
    editingGoalId = null;
    render();
    UI.toast(wasEdit ? 'Target diperbarui' : 'Target dibuat');
  }
  function askDeleteGoal(id) {
    const g = S.getGoal(id);
    if (!g) return;
    UI.confirmDialog({
      title: 'Hapus target?',
      text: `Target "${g.name}" (terkumpul ${U.rupiah(g.saved)}) akan dihapus. Transaksi tabungan yang sudah tercatat tidak ikut terhapus.`,
      onOk: () => {
        const res = S.deleteGoal(id);
        if (!res.ok) { UI.toast(res.errors._form, 'error'); return; }
        render();
        UI.toast('Target dihapus');
      },
    });
  }
  function updateSaveHint() {
    $('#saveBalanceHint').textContent = `(saldo ${U.rupiah(Math.max(0, S.balance()))})`;
  }
  function openSaveSheet(goalId) {
    const goals = S.getGoals();
    if (!goals.length) {
      UI.toast('Buat target tabungan dulu ya');
      showView('goals');
      openGoalSheet(null);
      return;
    }
    clearErrors($('#saveForm'));
    $('#saveGoal').innerHTML = goals.map((g) => `<option value="${g.id}">${E(g.name)} — ${U.rupiah(g.saved)} / ${U.rupiah(g.target)}</option>`).join('');
    if (goalId != null) $('#saveGoal').value = String(goalId);
    $('#saveAmount').value = '';
    $('#saveDeduct').checked = true;
    $('#saveAmount')._update();
    updateSaveHint();
    UI.openSheet('saveSheet');
    setTimeout(() => $('#saveAmount').focus(), 120);
  }
  function submitSave(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const res = S.addToGoal(Number($('#saveGoal').value), $('#saveAmount').value, $('#saveDeduct').checked);
    if (!res.ok) { showErrors(form, res.errors, { amount: '#saveAmount' }); return; }
    UI.closeSheet('saveSheet');
    render();
    UI.toast(`Tabungan ${U.rupiah(res.amount)} ditambahkan`);
  }

  /* ---------- global click handling ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = el.dataset.id ? Number(el.dataset.id) : null;
    switch (el.dataset.action) {
      case 'nav': showView(el.dataset.view); break;
      case 'goto': showView(el.dataset.view); break;
      case 'add-tx': openTxSheet({ type: el.dataset.type }); break;
      case 'edit-tx': openTxSheet({ id }); break;
      case 'delete-tx': askDeleteTx(id, false); break;
      case 'delete-from-sheet': if (editingTxId !== null) askDeleteTx(editingTxId, true); break;
      case 'add-goal': openGoalSheet(null); break;
      case 'edit-goal': openGoalSheet(id); break;
      case 'delete-goal': askDeleteGoal(id); break;
      case 'save-goal': openSaveSheet(id); break;
      case 'quick-save': openSaveSheet(null); break;
      case 'toggle-balance': prefs.hideBalance = !prefs.hideBalance; savePrefs(); renderHome(); break;
      case 'profile': $('#profileName').value = prefs.name; UI.openSheet('profileSheet'); break;
      case 'filter-type': view.type = el.dataset.value; renderTransactions(); break;
      case 'report-prev': view.reportMonth = U.addMonths(view.reportMonth, -1); renderReport(); break;
      case 'report-next': if (view.reportMonth < U.currentMonth()) { view.reportMonth = U.addMonths(view.reportMonth, 1); renderReport(); } break;
      case 'suffix': {
        const input = $('#' + el.dataset.target);
        const v = input.value.trim().replace(/(k|rb|jt|juta|ribu)$/i, '');
        input.value = v ? v + el.dataset.suffix : el.dataset.suffix === 'jt' ? '1jt' : '1k';
        input._update(); input.focus();
        break;
      }
      default: break;
    }
  });

  /* ---------- init ---------- */
  function init() {
    const info = S.load();
    $$('[data-ic]').forEach((el) => { el.innerHTML = UI.icon(el.dataset.ic, el.classList.contains('nav-ic') ? 24 : 22); });
    $('#searchIc').innerHTML = UI.icon('search', 18);
    UI.init();
    UI.bindConfirm();

    bindPreview('txAmount', 'txAmountPreview', 'Contoh: 15 = Rp15.000, 1jt = Rp1.000.000');
    bindPreview('goalTarget', 'goalTargetPreview', 'Contoh: 150 = Rp150.000');
    bindPreview('goalSaved', 'goalSavedPreview', 'Boleh 0');
    bindPreview('saveAmount', 'saveAmountPreview', 'Contoh: 20 = Rp20.000');

    $$('input[name="type"]', $('#txForm')).forEach((r) => r.addEventListener('change', () => setTxType(r.value)));
    $('#txForm').addEventListener('submit', submitTx);
    $('#goalForm').addEventListener('submit', submitGoal);
    $('#saveForm').addEventListener('submit', submitSave);
    $('#profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      prefs.name = $('#profileName').value.trim().slice(0, 24);
      savePrefs(); UI.closeSheet('profileSheet'); renderHome(); UI.toast('Profil disimpan');
    });
    $('#saveGoal').addEventListener('change', updateSaveHint);
    $('#txSearch').addEventListener('input', (e) => { view.q = e.target.value; renderTransactions(); });
    $('#txMonth').addEventListener('change', (e) => { view.month = e.target.value; renderTransactions(); });

    render();
    if (info.skipped) UI.toast(`${info.skipped} catatan tidak valid dilewati (cadangan asli tersimpan)`, 'error');
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  }
  init();
})();
