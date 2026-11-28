# Saku — Keuangan Pelajar

Aplikasi pencatat uang saku & target tabungan untuk pelajar. Mobile-first (dioptimalkan untuk Android),
bisa dipakai sebagai **PWA** dan dibuild jadi **APK** dengan Capacitor. Tanpa framework dan tanpa dependensi runtime.

## Fitur
- **Beranda**: sapaan, total saldo (bisa disembunyikan), aksi cepat (Pemasukan, Pengeluaran, Tabung, Laporan),
  ringkasan bulan ini, transaksi terbaru, ringkasan target tabungan.
- **Transaksi (CRUD penuh)**: tambah, lihat, **edit semua field** (judul, nominal, jenis, kategori, tanggal, catatan) pada
  data yang sama (tidak membuat duplikat), dan hapus dengan dialog konfirmasi. Ada pencarian, filter jenis, dan filter bulan.
- **Target tabungan (CRUD penuh)**: buat, edit nama/target/terkumpul, tambah tabungan, hapus dengan konfirmasi, progress bar & persen.
  Saat menabung ada opsi *Potong dari saldo* (mencatat pengeluaran kategori "Tabungan" agar saldo tetap akurat).
- **Input Rupiah pintar**: `15`→Rp15.000, `150`→Rp150.000, `1jt`→Rp1.000.000, `1.5jt`→Rp1.500.000, `500k`→Rp500.000,
  `25000`→Rp25.000. Juga: `25.000`, `1,5jt`, `500rb`, `2juta`. Awali `Rp` untuk nominal persis (`Rp500` = Rp500).
  Pratinjau hasil tampil langsung di bawah kolom input.
- **Laporan**: saldo, total pemasukan/pengeluaran, perbandingan 6 bulan, pengeluaran per kategori (donut + persen), pilih bulan.
- Tombol back Android menutup dialog lebih dulu (tidak langsung keluar aplikasi).

## Data & keamanan data
- Tetap memakai `localStorage` dengan key **`saku-pelajar-v1`** dan struktur lama (`transactions`, `goals`).
  Hanya ditambah field opsional (`note`, `goalId`, `version`).
- Saat pertama dibuka, data lama divalidasi/dimigrasi otomatis. **Salinan asli** disimpan di key `saku-pelajar-v1-backup`
  (tidak pernah ditimpa). Catatan yang rusak (jenis/nominal tidak valid) dilewati, bukan dihapus dari cadangan.
- Preferensi (nama panggilan, sembunyikan saldo) disimpan terpisah di key `saku-prefs`.

## Struktur proyek
```
index.html            kerangka halaman, dialog (bottom sheet)
style.css             seluruh tampilan (font sistem, tanpa CDN → aman offline)
js/utils.js           parser/format Rupiah, tanggal
js/store.js           penyimpanan, migrasi, validasi, CRUD, perhitungan
js/ui.js              ikon, toast, bottom sheet, dialog konfirmasi
js/app.js             render halaman + event
sw.js                 service worker (network-first, cache offline)
manifest.webmanifest  PWA     |  icons/  ikon app
capacitor.config.json Capacitor (tidak diubah)
.github/workflows/build-apk.yml  build APK
```

## Cara mencoba (web)
```bash
python3 -m http.server 8080   # lalu buka http://localhost:8080
```
Buka di Chrome → mode perangkat Android (F12 → Toggle device toolbar) untuk melihat tampilan mobile.

## Build APK tanpa PC (GitHub Actions)
1. Upload **isi** folder ini ke repository GitHub (branch `main`), bukan file ZIP-nya.
2. Buka tab **Actions** → workflow **Build Saku APK** (jalan otomatis setiap push ke `main`, atau klik *Run workflow*).
3. Setelah hijau, download artifact `Saku-Android-APK` → install `app-debug.apk`.

Workflow menyalin `index.html style.css manifest.webmanifest sw.js` plus folder `js/` dan `icons/` ke `www/`.
`appId` tetap `com.hafiz.saku`, jadi APK baru bisa dipasang di atas versi lama dan data lokal tetap ada.

## Build lokal dengan Capacitor
```bash
mkdir -p www && cp index.html style.css manifest.webmanifest sw.js www/ && cp -r js icons www/
npm init -y && npm install @capacitor/core @capacitor/android && npm install -D @capacitor/cli
npx cap add android && npx cap sync android
cd android && ./gradlew assembleDebug
```

## Catatan
- Data disimpan lokal di perangkat. Menghapus data aplikasi / uninstall dapat menghapus catatan.
- Aplikasi ini bukan bank dan tidak terhubung ke rekening atau dompet digital.
- APK hasil workflow adalah debug APK untuk pengujian pribadi, bukan release untuk Play Store.
