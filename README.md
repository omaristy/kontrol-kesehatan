# Catatan Asupan

Aplikasi web untuk mencatat makanan harian, menghitung kalori, protein, karbo, lemak, serat, gula, **purin, natrium, kolesterol, dan lemak jenuh**, lalu menelusuri makanan yang mungkin memicu **asam urat, tensi tinggi, kolesterol, dan gula darah**. Bisa dipasang seperti aplikasi (PWA, ada ikon), jalan tanpa internet, dan datanya dicadangkan ke **Google Sheets** milik Anda sendiri.

## Fitur
- **Hari ini**: gauge purin vs batas harian, ringkasan gizi, air putih, catatan per waktu makan.
- **Riwayat**: grafik 7/14/30 hari, daftar per hari, cari "kapan terakhir makan X".
- **Kesehatan**: pilih Asam urat, Tensi, Kolesterol, atau Gula darah. Catat serangan atau hasil ukur; aplikasi menampilkan makanan 1–7 hari sebelumnya, pemicu paling mungkin (purin, natrium, lemak jenuh+kolesterol, atau gula), faktor lain seperti alkohol, dan pola berulang dari semua kejadian tidak normal.
- **Saran**: bila hasil tensi, kolesterol, gula darah, atau asam urat tinggi, muncul saran "Yang bisa dilakukan" (sekarang, kurangi, pilih ini, kapan ke dokter) lengkap dengan makanan dari catatan Anda sendiri dan peringatan darurat untuk nilai sangat tinggi atau rendah. Di Hari Ini muncul "Saran hari ini" bila asupan melewati batas.
- **Makanan**: 109 makanan Indonesia bawaan + tambah makanan sendiri.
- Ekspor CSV, cadangan/pemulihan JSON.

> Nilai gizi dan purin adalah perkiraan rata-rata. Aplikasi ini alat bantu, bukan pengganti saran dokter.

## 1. Pasang database Google Sheets (±5 menit)
1. Buka https://sheets.new (buat Google Sheet baru, beri nama bebas).
2. Menu **Ekstensi > Apps Script**. Hapus isi default, tempel seluruh isi `apps-script/Code.gs`.
3. Di baris atas, ganti `GANTI-TOKEN-INI` dengan kata sandi karangan Anda (mis. `kunyit-2026-rahasia`). Ingat token ini.
4. Simpan (ikon disket). Pilih fungsi **setup** di menu atas, klik **Jalankan**, lalu setujui izin (Lanjutkan > Lanjutan > Buka ... (tidak aman) > Izinkan; ini wajar untuk skrip buatan sendiri).
5. Klik **Terapkan > Deployment baru > Jenis: Aplikasi web**.
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Klik Terapkan, salin **URL Aplikasi web** (berakhiran `/exec`).

Akan muncul 3 tab di Sheet: `Asupan`, `Kesehatan`, `Makanan Saya`. Jangan ubah kolom ID dan "Diubah (ms)". Jika Anda mengubah isi Code.gs di kemudian hari, pilih **Terapkan > Kelola deployment > Edit > Versi baru**.

## 2. Unggah ke GitHub Pages
1. Buat repositori baru di GitHub (mis. `catatan-asupan`), publik.
2. Unggah **isi folder ini** (index.html, sw.js, manifest.webmanifest, folder css, js, icons; folder apps-script boleh ikut atau tidak). Lewat web: **Add file > Upload files**, tarik semua, **Commit**.
3. **Settings > Pages > Build and deployment > Source: Deploy from a branch > Branch: main, folder /(root) > Save**.
4. Tunggu 1–2 menit. Alamatnya `https://USERNAME.github.io/catatan-asupan/`.

Isi `url` dan `token` di file `js/config.js` sebelum mengunggah, supaya aplikasi langsung tersambung. Perhatian: repositori publik bisa dibaca siapa saja, jadi URL dan token ikut terlihat. Pakai token yang unik dan jangan dipakai di tempat lain. Alternatifnya biarkan config.js kosong dan isi lewat menu **Setelan**.

## 3. Pasang di HP dan hubungkan
- **Android (Chrome)**: buka alamatnya, menu titik tiga > **Instal aplikasi**.
- **iPhone (Safari)**: Bagikan > **Tambahkan ke Layar Utama**.
- Buka aplikasi > **Setelan > Google Sheets**, isi URL `/exec` dan token, lalu **Simpan & tes koneksi**.

Beda HP? Pasang di HP kedua, isi URL dan token yang sama; data ikut sinkron.

## Cara pakai untuk melacak kesehatan
1. Catat makanan setiap kali makan (termasuk minuman).
2. Saat nyeri muncul atau setelah mengukur tensi/cek lab, buka tab **Kesehatan**, pilih kondisinya, lalu catat.
3. Aplikasi langsung menampilkan asupan relevan per hari sebelum kejadian (mis. natrium untuk tensi), dibanding hari biasa, plus makanan pemicu paling mungkin. Setelah 2+ kejadian tidak normal, bagian "Pola dari semua kejadian" menunjukkan makanan yang berulang.

Batas rujukan (dapat diubah di Setelan): natrium 2.000 mg, kolesterol makanan 300 mg, lemak jenuh 20 g, purin 400 mg, gula 50 g per hari. Tingkat tensi/kolesterol/gula/asam urat memakai rujukan umum, bukan diagnosis.

## Memperbarui dari versi lama
Jika Anda sudah memasang backend sebelumnya: tempel ulang seluruh `apps-script/Code.gs` (jangan lupa isi ulang `TOKEN`), jalankan fungsi **setup** sekali lagi, lalu **Terapkan > Kelola deployment > Edit (ikon pensil) > Versi: Versi baru > Terapkan**. URL `/exec` tetap sama. Data lama aman; kolom baru ditambahkan di sebelah kanan.

## Memperbarui aplikasi
Ubah angka `CACHE = 'asupan-v1'` di `sw.js` (mis. `asupan-v2`) setiap kali Anda mengunggah versi baru, agar HP mengambil file terbaru.

## Catatan teknis
- Tanpa framework dan tanpa build; semua file statis.
- Data utama tersimpan di HP (localStorage), Sheets sebagai cadangan dan sinkron antar perangkat (yang terbaru menang per catatan).
- Hapus data dari baris Sheet secara manual tidak disarankan; hapus lewat aplikasi (baris ditandai `Dihapus`).
