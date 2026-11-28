/* SAKU — utilities: Rupiah parsing/formatting, dates, small helpers */
(function (g) {
  'use strict';
  const Saku = (g.Saku = g.Saku || {});

  const MAX_AMOUNT = 1e12;
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const pad = (n) => String(n).padStart(2, '0');

  /**
   * Smart Rupiah parser. Returns an integer amount in rupiah, or NaN.
   *   "15" -> 15.000        "150" -> 150.000      "1jt" -> 1.000.000
   *   "1.5jt"/"1,5jt" -> 1.500.000                "500k"/"500rb" -> 500.000
   *   "25000" -> 25.000     "25.000" -> 25.000    "1.500.000" -> 1.500.000
   *   "Rp500" -> 500 (explicit "Rp" prefix = exact rupiah, no shorthand)
   * Plain numbers below 1000 are read as thousands; 1000 and above are exact.
   */
  function parseMoney(raw) {
    let s = String(raw == null ? '' : raw).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return NaN;
    let exact = false;
    if (s.startsWith('rp')) {
      exact = true;
      s = s.slice(2);
      if (s.startsWith('.')) s = s.slice(1);
    }
    const m = s.match(/^([0-9.,]+)(juta|jt|ribu|rb|k)?$/);
    if (!m) return NaN;
    let num = m[1];
    const unit = m[2];
    let mult = 1;
    if (unit) mult = unit === 'juta' || unit === 'jt' ? 1e6 : 1e3;

    if (num.includes('.') && num.includes(',')) {
      // Indonesian style: 1.234,5
      num = num.replace(/\./g, '').replace(',', '.');
    } else if (!unit && /^\d{1,3}(\.\d{3})+$/.test(num)) {
      num = num.replace(/\./g, ''); // thousands separators
    } else if (/^\d+([.,]\d+)?$/.test(num)) {
      num = num.replace(',', '.'); // decimal
    } else {
      return NaN;
    }
    const value = Number(num);
    if (!Number.isFinite(value) || value < 0) return NaN;
    if (!unit && !exact && value < 1000) mult = 1000;
    const result = Math.round(value * mult);
    return result <= MAX_AMOUNT ? result : NaN;
  }

  const groupDigits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function rupiah(n) {
    n = Math.round(Number(n) || 0);
    return (n < 0 ? '−' : '') + 'Rp' + groupDigits(Math.abs(n));
  }
  function compact(n) {
    n = Math.round(Number(n) || 0);
    const trim = (x) => x.toFixed(1).replace(/\.0$/, '').replace('.', ',');
    if (n >= 1e9) return trim(n / 1e9) + 'M';
    if (n >= 1e6) return trim(n / 1e6) + 'jt';
    if (n >= 1e3) return trim(n / 1e3) + 'rb';
    return String(n);
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // local time, not UTC
  }
  const currentMonth = () => today().slice(0, 7);
  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y >= 1970 && y <= 2100;
  }
  function addMonths(key, n) {
    const [y, m] = key.split('-').map(Number);
    const t = y * 12 + (m - 1) + n;
    return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
  }
  function monthLabel(key, short) {
    const [y, m] = key.split('-').map(Number);
    return `${(short ? MONTHS_SHORT : MONTHS)[m - 1]} ${y}`;
  }
  function formatDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
  }
  function dayLabel(s) {
    const t = today();
    if (s === t) return 'Hari ini';
    const [y, m, d] = t.split('-').map(Number);
    const yest = new Date(y, m - 1, d - 1);
    if (s === `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`) return 'Kemarin';
    const [sy, sm, sd] = s.split('-').map(Number);
    return `${DAYS[new Date(sy, sm - 1, sd).getDay()]}, ${sd} ${MONTHS_SHORT[sm - 1]} ${sy}`;
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  }
  function percent(saved, target) {
    if (!(target > 0)) return 0;
    if (saved >= target) return 100;
    return Math.min(99, Math.max(saved > 0 ? 1 : 0, Math.round((saved / target) * 100)));
  }
  const escapeHTML = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const INCOME_CATS = ['Uang saku', 'Gaji / Part-time', 'Hadiah', 'Lainnya'];
  const EXPENSE_CATS = ['Makanan', 'Transportasi', 'Sekolah', 'Hiburan', 'Belanja', 'Pulsa & Data', 'Tabungan', 'Lainnya'];

  Saku.utils = {
    MAX_AMOUNT, MONTHS, MONTHS_SHORT, INCOME_CATS, EXPENSE_CATS,
    parseMoney, rupiah, compact, today, currentMonth, isValidDate, addMonths,
    monthLabel, formatDate, dayLabel, greeting, percent, escapeHTML,
  };
})(typeof window !== 'undefined' ? window : globalThis);
