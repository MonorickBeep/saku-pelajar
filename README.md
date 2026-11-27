# Saku — Keuangan Pelajar

Project website pencatat uang saku dengan ringkasan saldo, transaksi, dan target tabungan.

## Build APK tanpa PC (GitHub Actions)

1. Buat repository GitHub baru bernama `saku-pelajar`.
2. Upload isi folder project ini ke repository (bukan file ZIP-nya).
3. Pastikan branch bernama `main`.
4. Buka tab **Actions** pada repository.
5. Pilih workflow **Build Saku APK**, lalu tekan **Run workflow** jika belum berjalan otomatis.
6. Tunggu sampai job selesai dengan tanda centang hijau.
7. Buka hasil run tersebut, scroll ke **Artifacts**, lalu download `Saku-Android-APK`.
8. Ekstrak ZIP artifact dan install `app-debug.apk` di Android. Jika diminta, izinkan instalasi aplikasi dari sumber tersebut.

Build juga berjalan otomatis setiap kali ada perubahan yang di-push ke branch `main`.

## Build lokal dengan Capacitor

Project ini memakai folder `www` sebagai webDir. Salin `index.html`, `style.css`, `app.js`, `manifest.webmanifest`, dan `sw.js` ke folder `www`, lalu jalankan:

```bash
npm init -y
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap add android
npx cap sync android
```

## Catatan
- Data disimpan lokal di perangkat/browser melalui localStorage. Menghapus data aplikasi dapat menghapus catatan.
- Aplikasi ini bukan bank dan tidak terhubung ke rekening atau dompet digital.
- APK hasil workflow adalah debug APK untuk pengujian pribadi, bukan release APK bertanda tangan untuk Play Store.
