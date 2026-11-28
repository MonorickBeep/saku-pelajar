/* SAKU — data layer: localStorage persistence, safe migration, validation, CRUD, calculations.
 * Storage key and record shapes stay compatible with the original app:
 *   saku-pelajar-v1 = { transactions:[{id,type,title,amount,category,date,note?}], goals:[{id,name,target,saved}] }
 * The upgrade only ADDS optional fields (note, goalId, version). */
(function (g) {
  'use strict';
  const Saku = (g.Saku = g.Saku || {});
  const U = Saku.utils;

  const KEY = 'saku-pelajar-v1';
  const BACKUP_KEY = 'saku-pelajar-v1-backup'; // untouched copy of the pre-upgrade data
  const VERSION = 2;

  let state = { version: VERSION, transactions: [], goals: [] };
  let loadInfo = { skipped: 0, migrated: false, corrupt: false };

  const lsGet = (k) => { try { return g.localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { g.localStorage.setItem(k, v); return true; } catch (e) { return false; } };

  function migrate(parsed) {
    const info = { skipped: 0 };
    const src = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    const used = new Set();
    const uid = (wanted) => {
      let id = Number.isFinite(Number(wanted)) && wanted !== null && wanted !== '' ? Number(wanted) : Date.now();
      while (used.has(id)) id += 1;
      used.add(id);
      return id;
    };

    const transactions = [];
    (Array.isArray(src.transactions) ? src.transactions : []).forEach((t) => {
      if (!t || typeof t !== 'object') { info.skipped++; return; }
      const amount = Math.round(Number(t.amount));
      if ((t.type !== 'income' && t.type !== 'expense') || !Number.isFinite(amount) || amount <= 0) { info.skipped++; return; }
      let date = typeof t.date === 'string' ? t.date.slice(0, 10) : '';
      if (!U.isValidDate(date)) date = U.today();
      transactions.push({
        ...t,
        id: uid(t.id),
        type: t.type,
        title: String(t.title == null ? '' : t.title).trim() || 'Tanpa judul',
        amount,
        category: String(t.category == null ? '' : t.category).trim() || 'Lainnya',
        date,
        note: typeof t.note === 'string' ? t.note : '',
      });
    });

    const goals = [];
    (Array.isArray(src.goals) ? src.goals : []).forEach((gl) => {
      if (!gl || typeof gl !== 'object') { info.skipped++; return; }
      const target = Math.round(Number(gl.target));
      let saved = Math.round(Number(gl.saved));
      if (!Number.isFinite(target) || target <= 0) { info.skipped++; return; }
      if (!Number.isFinite(saved) || saved < 0) saved = 0;
      goals.push({ ...gl, id: uid(gl.id), name: String(gl.name == null ? '' : gl.name).trim() || 'Target', target, saved });
    });

    return { data: { ...src, version: VERSION, transactions, goals }, skipped: info.skipped };
  }

  function persist() {
    return lsSet(KEY, JSON.stringify(state));
  }

  function load() {
    const raw = lsGet(KEY);
    let parsed = null;
    let corrupt = false;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) { corrupt = true; }
    }
    // Always keep an untouched copy of whatever was there before the first upgraded write.
    if (raw && lsGet(BACKUP_KEY) === null) lsSet(BACKUP_KEY, raw);
    const { data, skipped } = migrate(parsed);
    const needsWrite = !raw || corrupt || !parsed || parsed.version !== VERSION || JSON.stringify(parsed) !== JSON.stringify(data);
    state = data;
    loadInfo = { skipped, migrated: !!raw && needsWrite, corrupt };
    if (needsWrite) persist();
    return loadInfo;
  }

  /** Run a mutation; roll back in-memory state if the write to storage fails. */
  function commit(mutator) {
    const snapshot = JSON.stringify(state);
    mutator();
    if (!persist()) {
      state = JSON.parse(snapshot);
      return false;
    }
    return true;
  }
  const STORAGE_ERR = { ok: false, errors: { _form: 'Gagal menyimpan data. Penyimpanan perangkat mungkin penuh.' } };

  function nextId() {
    const used = new Set([...state.transactions, ...state.goals].map((x) => x.id));
    let id = Date.now();
    while (used.has(id)) id += 1;
    return id;
  }

  /* ---------- validation ---------- */
  function validateTransaction(inp) {
    const errors = {};
    const type = inp.type === 'income' || inp.type === 'expense' ? inp.type : null;
    if (!type) errors.type = 'Pilih jenis transaksi.';
    const title = String(inp.title == null ? '' : inp.title).trim();
    if (!title) errors.title = 'Nama transaksi wajib diisi.';
    else if (title.length > 45) errors.title = 'Maksimal 45 karakter.';
    const amount = U.parseMoney(inp.amount);
    if (!Number.isFinite(amount)) errors.amount = 'Nominal tidak valid. Contoh: 15, 150, 1jt, 500k.';
    else if (amount <= 0) errors.amount = 'Nominal harus lebih dari 0.';
    const category = String(inp.category == null ? '' : inp.category).trim();
    if (!category) errors.category = 'Pilih kategori.';
    else if (category.length > 40) errors.category = 'Kategori terlalu panjang.';
    if (!U.isValidDate(inp.date)) errors.date = 'Tanggal tidak valid.';
    const note = String(inp.note == null ? '' : inp.note).trim();
    if (note.length > 120) errors.note = 'Maksimal 120 karakter.';
    return { ok: Object.keys(errors).length === 0, errors, value: { type, title, amount, category, date: inp.date, note } };
  }

  function validateGoal(inp) {
    const errors = {};
    const name = String(inp.name == null ? '' : inp.name).trim();
    if (!name) errors.name = 'Nama target wajib diisi.';
    else if (name.length > 40) errors.name = 'Maksimal 40 karakter.';
    const target = U.parseMoney(inp.target);
    if (!Number.isFinite(target)) errors.target = 'Nominal tidak valid. Contoh: 150, 1jt, 500k.';
    else if (target <= 0) errors.target = 'Target harus lebih dari 0.';
    const saved = U.parseMoney(inp.saved === '' || inp.saved == null ? '0' : inp.saved);
    if (!Number.isFinite(saved)) errors.saved = 'Nominal tidak valid. Contoh: 0, 15, 1jt.';
    return { ok: Object.keys(errors).length === 0, errors, value: { name, target, saved } };
  }

  /* ---------- transactions ---------- */
  const getTransaction = (id) => state.transactions.find((t) => t.id === id) || null;

  function addTransaction(inp) {
    const v = validateTransaction(inp);
    if (!v.ok) return v;
    let item;
    if (!commit(() => { item = { id: nextId(), ...v.value }; state.transactions.push(item); })) return STORAGE_ERR;
    return { ok: true, item };
  }
  function updateTransaction(id, inp) {
    const existing = getTransaction(id);
    if (!existing) return { ok: false, errors: { _form: 'Transaksi tidak ditemukan.' } };
    const v = validateTransaction(inp);
    if (!v.ok) return v;
    if (!commit(() => { Object.assign(getTransaction(id), v.value); })) return STORAGE_ERR; // same record, no duplicate
    return { ok: true, item: getTransaction(id) };
  }
  function deleteTransaction(id) {
    if (!getTransaction(id)) return { ok: false, errors: { _form: 'Transaksi tidak ditemukan.' } };
    if (!commit(() => { state.transactions = state.transactions.filter((t) => t.id !== id); })) return STORAGE_ERR;
    return { ok: true };
  }

  /* ---------- goals ---------- */
  const getGoal = (id) => state.goals.find((x) => x.id === id) || null;

  function addGoal(inp) {
    const v = validateGoal(inp);
    if (!v.ok) return v;
    let item;
    if (!commit(() => { item = { id: nextId(), ...v.value }; state.goals.push(item); })) return STORAGE_ERR;
    return { ok: true, item };
  }
  function updateGoal(id, inp) {
    if (!getGoal(id)) return { ok: false, errors: { _form: 'Target tidak ditemukan.' } };
    const v = validateGoal(inp);
    if (!v.ok) return v;
    if (!commit(() => { Object.assign(getGoal(id), v.value); })) return STORAGE_ERR;
    return { ok: true, item: getGoal(id) };
  }
  function deleteGoal(id) {
    if (!getGoal(id)) return { ok: false, errors: { _form: 'Target tidak ditemukan.' } };
    if (!commit(() => { state.goals = state.goals.filter((x) => x.id !== id); })) return STORAGE_ERR;
    return { ok: true };
  }
  /** Add money to a goal. If deduct=true, also records an expense (category "Tabungan") so the balance stays accurate. */
  function addToGoal(id, rawAmount, deduct, date) {
    const goal = getGoal(id);
    if (!goal) return { ok: false, errors: { _form: 'Target tidak ditemukan.' } };
    const amount = U.parseMoney(rawAmount);
    if (!Number.isFinite(amount)) return { ok: false, errors: { amount: 'Nominal tidak valid. Contoh: 15, 150, 1jt, 500k.' } };
    if (amount <= 0) return { ok: false, errors: { amount: 'Nominal harus lebih dari 0.' } };
    if (deduct && amount > balance()) {
      return { ok: false, errors: { amount: `Saldo tidak cukup (tersedia ${U.rupiah(Math.max(0, balance()))}). Hilangkan centang untuk menabung tanpa memotong saldo.` } };
    }
    if (!commit(() => {
      const gl = getGoal(id);
      gl.saved += amount;
      if (deduct) {
        state.transactions.push({
          id: nextId(), type: 'expense', title: `Tabungan: ${gl.name}`.slice(0, 45), amount,
          category: 'Tabungan', date: date && U.isValidDate(date) ? date : U.today(), note: '', goalId: gl.id,
        });
      }
    })) return STORAGE_ERR;
    return { ok: true, amount };
  }

  /* ---------- calculations (always from real transaction data) ---------- */
  const sum = (list, type) => list.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);
  const inMonth = (key) => state.transactions.filter((t) => t.date.startsWith(key));
  function balance() { return sum(state.transactions, 'income') - sum(state.transactions, 'expense'); }
  function totals() {
    const income = sum(state.transactions, 'income');
    const expense = sum(state.transactions, 'expense');
    return { income, expense, balance: income - expense };
  }
  function monthSummary(key) {
    const list = inMonth(key);
    const income = sum(list, 'income');
    const expense = sum(list, 'expense');
    return { income, expense, net: income - expense, count: list.length };
  }
  function monthlySeries(endKey, count) {
    const out = [];
    for (let i = count - 1; i >= 0; i--) {
      const key = U.addMonths(endKey, -i);
      out.push({ key, ...monthSummary(key) });
    }
    return out;
  }
  function expenseByCategory(key) {
    const map = new Map();
    inMonth(key).filter((t) => t.type === 'expense').forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return {
      total,
      items: [...map.entries()].map(([name, amount]) => ({ name, amount, pct: total ? (amount / total) * 100 : 0 })).sort((a, b) => b.amount - a.amount),
    };
  }
  const sortedTransactions = () => [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  Saku.store = {
    KEY, BACKUP_KEY, load, migrate, validateTransaction, validateGoal,
    getTransactions: () => state.transactions, getGoals: () => state.goals, sortedTransactions,
    getTransaction, addTransaction, updateTransaction, deleteTransaction,
    getGoal, addGoal, updateGoal, deleteGoal, addToGoal,
    balance, totals, monthSummary, monthlySeries, expenseByCategory,
  };
})(typeof window !== 'undefined' ? window : globalThis);
