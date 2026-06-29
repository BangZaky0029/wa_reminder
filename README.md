# 🚀 Sistem Automasi Pengingat (Reminder) Cashbond via WhatsApp

Selamat datang di layanan **WhatsApp Bot Reminder**! Modul ini dirancang khusus untuk memonitor, mengelola, dan mengirimkan pesan peringatan tagihan Cashbond (Pinjaman Karyawan) secara serba otomatis tanpa campur tangan manual.

---

## 📦 Isi Produk (Fitur Utama)

Aplikasi ini bukan sekadar *script* biasa, melainkan sebuah sistem tangguh dengan arsitektur *backend* yang kuat:
1. **Engine WhatsApp Super Ringan:** Menggunakan library `Baileys` (Koneksi WebSocket langsung) sehingga tidak memerlukan browser/Puppeteer. Jauh lebih cepat dan hemat memori RAM.
2. **Cloud Session Management:** Data sesi rahasia (Auth Keys) langsung diunggah secara aman dan terenkripsi ke **Supabase Database**. Sesi tidak akan hilang walau server di-*restart*.
3. **Smart Cron Scheduler (`node-cron`):** Robot pekerja otomatis yang aktif pada jam tertentu setiap harinya untuk memeriksa database karyawan mana saja yang sudah mendekati jatuh tempo.
4. **Auto-Formatter Template:** Pesan *WhatsApp* dihasilkan secara dinamis. Otomatis mengubah angka menjadi format Rupiah (Rp) dan merapikan nomor HP dari sistem secara mandiri (mengubah `08...` menjadi `628...`).
5. **CLI Interaktif (Command Line Interface):** Panel kontrol dalam terminal yang elegan untuk melakukan Login (Scan QR), Logout, maupun Testing Pengiriman secara instan tanpa ribet.
6. **Watchdog & Anti-Spam:** Sistem pelindung anti-banned yang memberikan jeda (delay) antar pesan, dan sistem yang otomatis menyambung ulang (*auto-reconnect*) jika jaringan terputus.

---

## 💡 Manfaat yang Anda Dapatkan

- **Otomatisasi Total (Zero Touch):** Admin/HR tidak perlu lagi mencatat tanggal dan mengetik pesan tagihan satu-per-satu. Sistem yang akan bekerja menagih untuk Anda 24/7.
- **Mengurangi Angka Keterlambatan Pembayaran:** Dengan adanya sistem peringatan bertahap (H-3, H-1, Hari H, hingga Overdue), probabilitas karyawan lupa membayar Cashbond menjadi hampir 0%.
- **Citra Perusahaan yang Profesional:** Template pengiriman ditata dengan tipografi profesional, lengkap dengan pembatas rapi dan emoji.
- **Mencegah Duplikasi Spam:** Sistem cerdas mencatat riwayat pengiriman di tabel log database untuk memastikan satu tagihan tidak ditagih dua kali pada hari yang sama.
- **Skalabilitas Tinggi:** Dapat dengan mudah dikembangkan jika ke depan Anda butuh bot ini untuk melayani *Customer Service*, OTP, maupun *Marketing Broadcast*.

---

## 🛠️ Cara Penggunaan & Instalasi

### 1. Persiapan Environment
Buat file bernama `.env` di dalam folder ini (atau *copy* dari `example.env` jika ada), dan isi dengan kredensial berikut:
```env
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_KEY=eyJhbGci...[SUPABASE_ANON_KEY]...
CRON_SCHEDULE="0 15 * * *" 
# Keterangan: Jadwal cron menggunakan standar linux. "0 15 * * *" artinya jalan setiap jam 15:00 waktu server.
```

### 2. Instalasi Dependensi
Pastikan Anda sudah menginstal **Node.js** di perangkat Anda, lalu jalankan perintah ini di terminal:
```bash
npm install
```

### 3. Cara Menjalankan Bot
Jalankan perintah ini di dalam direktori project:
```bash
node src/index.js
```
Setelah aplikasi berjalan, terminal Anda akan menampilkan Menu Interaktif berikut:

> **Menu 1 (Login Session):** 
> Pilih menu ini untuk pertama kalinya. Sistem akan memunculkan **QR Code** di layar Anda. Silakan *scan* dengan aplikasi WhatsApp (tautkan perangkat). Setelah terkoneksi, sesi Anda aman di awan (Cloud).
>
> **Menu 4 (Test Jalankan Reminder):** 
> Gunakan menu ini jika Anda ingin memaksa robot untuk langsung mengecek jatuh tempo Cashbond dan menembakkan pesan tagihan *detik itu juga*, tanpa harus menunggu jadwal jam Cron.
>
> **Menu 2 (Logout Session):**
> Gunakan opsi ini jika Anda ingin mengganti nomor WhatsApp bot. Sistem akan membersihkan semua data sesi rahasia Anda secara bersih dari database.
>
> **Menu 3 (Exit):** Mematikan program secara aman.

---

_Dikembangkan dengan ❤️ untuk kelancaran bisnis Anda._
"# wa_reminder" 
